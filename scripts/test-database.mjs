import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
import { createSeed, id } from "../src/lib/seed.ts";
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`create role anon;create role authenticated;create schema auth;
create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for (const file of readdirSync("supabase/migrations").sort())
  await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
await db.exec(readFileSync("supabase/seed.sql", "utf8"));
const seed = createSeed();
for (const user of seed.profiles)
  await db.query("insert into auth.users(id) values($1)", [user.id]);
await db.query(
  "update profiles set role='admin',full_name='مدیر' where id=$1",
  [id(4)],
);
await db.query(
  "update profiles set role='supplier',supplier_id=$1 where id=$2",
  [id(200), id(5)],
);
const asUser = async (user, fn) =>
  db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user,
    ]);
    return fn(tx);
  });
const rpc = async (user, sql, params = []) =>
  asUser(user, (tx) => tx.query(sql, params));
const onboard = (name) => ({
  name,
  type: "کافه",
  city: "کرمان",
  area: "مرکز",
  address: "کرمان، نشانی آزمون",
  phone: "09123456789",
  full_name: "کاربر آزمون",
});
const b1 = (
  await rpc(id(1), "select onboard_business($1::jsonb) as id", [
    onboard("کافه اول"),
  ])
).rows[0].id;
const b2 = (
  await rpc(id(2), "select onboard_business($1::jsonb) as id", [
    onboard("کافه دوم"),
  ])
).rows[0].id;
await rpc(id(4), "select manage_member($1,$2,$3)", [b1, id(3), "employee"]);
assert.equal(
  (await rpc(id(1), "select * from businesses")).rows.length,
  1,
  "tenants see only their business",
);
assert.equal(
  (await rpc(id(2), "select * from businesses where id=$1", [b1])).rows.length,
  0,
);
await assert.rejects(
  () => rpc(id(3), "update profiles set role='admin' where id=$1", [id(3)]),
  /permission denied/,
);
await assert.rejects(
  () => rpc(id(1), "insert into suppliers(name) values('bad')"),
  /row-level security/,
);
const draft = {
  items: [
    { product_id: id(100), quantity: 2, note: "" },
    { product_id: id(101), quantity: 12, note: "" },
  ],
  urgency: "normal",
  note: "",
};
const req = (
  await rpc(id(3), "select create_material_request($1,$2::jsonb) as id", [
    b1,
    draft,
  ])
).rows[0].id;
assert.equal(
  (await rpc(id(2), "select * from material_requests where id=$1", [req])).rows
    .length,
  0,
);
await assert.rejects(
  () => rpc(id(3), "select review_request($1,$2)", [req, "approved"]),
  /FORBIDDEN/,
);
await assert.rejects(
  () => rpc(id(2), "select review_request($1,$2)", [req, "approved"]),
  /FORBIDDEN/,
);
await rpc(id(3), "select edit_material_request($1,$2::jsonb)", [req, draft]);
await rpc(id(1), "select review_request($1,$2)", [req, "approved"]);
await assert.rejects(
  () => rpc(id(3), "select edit_material_request($1,$2::jsonb)", [req, draft]),
  /INVALID_TRANSITION/,
);
await rpc(id(1), "select add_request_to_basket($1)", [req]);
await rpc(id(1), "select add_request_to_basket($1)", [req]);
const basket = (
  await rpc(id(1), "select * from procurement_baskets where business_id=$1", [
    b1,
  ])
).rows[0];
const lines = (
  await rpc(id(1), "select * from basket_items where basket_id=$1", [basket.id])
).rows;
assert.equal(lines.length, 2, "request cannot be added twice");
assert.equal(
  (await rpc(id(3), "select * from basket_items")).rows.length,
  0,
  "employees cannot read baskets",
);
const offers = (
  await rpc(id(1), "select * from supplier_offers where supplier_id=$1", [
    id(200),
  ])
).rows;
const selections = lines.map((l) => ({
  basket_item_id: l.id,
  offer_id: offers.find((o) => o.product_id === l.product_id).id,
  updated_at: offers.find((o) => o.product_id === l.product_id).updated_at,
}));
const total = lines.reduce(
  (s, l) =>
    s +
    Number(l.quantity) *
      Number(offers.find((o) => o.product_id === l.product_id).price),
  50000,
);
const token = crypto.randomUUID();
const checkoutArgs = [
  b1,
  selections,
  total,
  basket.updated_at,
  token,
  "",
  "کرمان، نشانی تست",
];
const checkoutSql = "select checkout($1,$2::jsonb,$3,$4,$5,$6,$7) as ids";
await assert.rejects(
  () =>
    rpc(id(1), checkoutSql, [
      b1,
      selections,
      total - 1,
      basket.updated_at,
      token,
      "",
      "کرمان، نشانی تست",
    ]),
  /PRICE_CHANGED/,
);
assert.equal(
  (await rpc(id(1), "select * from orders")).rows.length,
  0,
  "checkout rollback is atomic",
);
assert.equal((await rpc(id(1), "select * from basket_items")).rows.length, 2);
const orderIds = (await rpc(id(1), checkoutSql, checkoutArgs)).rows[0].ids;
assert.equal(orderIds.length, 1);
assert.deepEqual(
  (await rpc(id(1), checkoutSql, checkoutArgs)).rows[0].ids,
  orderIds,
  "checkout retries are idempotent",
);
assert.equal(
  (await rpc(id(1), "select status from material_requests where id=$1", [req]))
    .rows[0].status,
  "purchased",
);
assert.equal((await rpc(id(2), "select * from orders")).rows.length, 0);
assert.equal((await rpc(id(3), "select * from orders")).rows.length, 0);
assert.equal(
  (await rpc(id(5), "select * from orders")).rows.length,
  1,
  "supplier can see its orders",
);
await assert.rejects(
  () =>
    rpc(id(1), "select change_order_status($1,$2,$3)", [
      orderIds[0],
      "reviewing",
      "",
    ]),
  /FORBIDDEN/,
);
await assert.rejects(
  () =>
    rpc(id(5), "select change_order_status($1,$2,$3)", [
      orderIds[0],
      "delivered",
      "",
    ]),
  /INVALID_TRANSITION/,
);
for (const status of [
  "reviewing",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
])
  await rpc(id(5), "select change_order_status($1,$2,$3)", [
    orderIds[0],
    status,
    "آزمون",
  ]);
assert.equal(
  (
    await rpc(id(1), "select * from order_status_history where order_id=$1", [
      orderIds[0],
    ])
  ).rows.length,
  6,
);
await assert.rejects(
  () =>
    rpc(id(5), "select change_order_status($1,$2,$3)", [
      orderIds[0],
      "cancelled",
      "آزمون",
    ]),
  /INVALID_TRANSITION/,
);
await assert.rejects(
  () =>
    rpc(id(2), "select edit_basket($1,$2,$3::jsonb)", [
      b1,
      "add",
      { product_id: id(100), quantity: 2 },
    ]),
  /FORBIDDEN/,
);
assert.equal(
  (await rpc(id(4), "select * from businesses")).rows.length,
  2,
  "admin sees both tenants",
);
await assert.rejects(
  () =>
    rpc(id(2), "select update_business($1,$2::jsonb)", [
      b1,
      onboard("دسترسی غیرمجاز"),
    ]),
  /FORBIDDEN/,
);
await assert.rejects(
  () =>
    rpc(id(3), "select update_business($1,$2::jsonb)", [
      b1,
      onboard("دسترسی کارمند"),
    ]),
  /FORBIDDEN/,
);
await rpc(id(4), "select update_business($1,$2::jsonb)", [
  b2,
  onboard("کافه دوم ویرایش‌شده"),
]);
assert.equal(
  (await rpc(id(2), "select name from businesses where id=$1", [b2])).rows[0]
    .name,
  "کافه دوم ویرایش‌شده",
);
assert.equal(
  (await rpc(id(4), "select full_name from profiles where id=$1", [id(4)]))
    .rows[0].full_name,
  "مدیر",
  "editing another business preserves admin identity",
);
assert.notEqual(b1, b2);
console.log(
  "PASS: migrations, seed, onboarding, RLS tenant isolation, employee/admin/supplier permissions, editable requests, atomic/idempotent checkout, audit timeline.",
);
await db.close();
