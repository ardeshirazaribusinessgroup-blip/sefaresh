"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Package,
  Plus,
  Search,
  Store,
  Truck,
  Users,
  Pencil,
  Layers,
  ArrowLeftRight,
} from "lucide-react";
import { z } from "zod";
import { useApp } from "./provider";
import { BusinessForm } from "./profile";
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  Notice,
  PageTitle,
  Panel,
} from "./ui";
import { date, money, normalize, number } from "@/lib/format";
import type { AdminTable, Business } from "@/lib/types";
const cards = [
  [
    "products",
    "کالاها و دسته‌بندی‌ها",
    "ایجاد، ویرایش و بایگانی اقلام خرید",
    Package,
  ],
  ["suppliers", "تأمین‌کنندگان", "شرایط ارسال و اطلاعات تأمین", Store],
  ["offers", "قیمت و موجودی", "ثبت دستی قیمت‌های به‌روز", ArrowLeftRight],
  ["requests", "درخواست‌ها", "بررسی نیازهای کسب‌وکارها", ClipboardList],
  ["orders", "سفارش‌ها", "پیگیری و ثبت وضعیت سفارش", Truck],
  ["customers", "کسب‌وکارها و کاربران", "اطلاعات مشتری و نقش اعضای تیم", Users],
] as const;
export function AdminDashboard() {
  const { data } = useApp();
  if (!data) return null;
  return (
    <>
      <PageTitle
        title="مدیریت عملیات سفارش"
        subtitle="اطلاعات تأمین را به‌روز نگه دارید و خریدها را تا تحویل پیگیری کنید."
      />
      <div className="stats-grid">
        {[
          ["کسب‌وکار", data.businesses.length],
          ["کالای فعال", data.products.filter((p) => p.active).length],
          ["تأمین‌کننده", data.suppliers.filter((s) => s.active).length],
          [
            "سفارش باز",
            data.orders.filter(
              (o) => !["delivered", "cancelled"].includes(o.status),
            ).length,
          ],
        ].map(([label, count]) => (
          <Panel className="stat-card" key={label}>
            <span className="muted">{label}</span>
            <div className="stat-value">{number(Number(count))}</div>
          </Panel>
        ))}
      </div>
      <div className="admin-cards">
        {cards.map(([path, title, text, Icon]) => (
          <Panel className="admin-card" key={path}>
            <Icon size={27} />
            <h3>{title}</h3>
            <p>{text}</p>
            <Link href={`/admin/${path}`} className="text-link">
              مدیریت {title} ←
            </Link>
          </Panel>
        ))}
      </div>
    </>
  );
}
type FormRecord = Record<string, string | number | boolean | null>;
type Spec = {
  key: string;
  label: string;
  type?: "number" | "select" | "textarea" | "checkbox";
  options?: { value: string; label: string }[];
  min?: number;
  step?: string;
  required?: boolean;
};
export function AdminCatalog({
  kind,
}: {
  kind: "products" | "suppliers" | "offers";
}) {
  const app = useApp();
  const [query, setQuery] = useState("");
  const [record, setRecord] = useState<FormRecord | null>(null);
  const [categoryEdit, setCategoryEdit] = useState<FormRecord | null>(null);
  const [error, setError] = useState("");
  if (!app.data) return null;
  const data = app.data;
  const table: AdminTable = kind === "offers" ? "supplier_offers" : kind;
  const title =
    kind === "products"
      ? "کالاها و دسته‌بندی‌ها"
      : kind === "suppliers"
        ? "تأمین‌کنندگان"
        : "قیمت و موجودی";
  const defaults: Record<typeof kind, FormRecord> = {
    products: {
      name: "",
      category_id: data.categories[0]?.id || "",
      brand: "",
      unit: "کیلوگرم",
      package_size: 1,
      description: "",
      active: true,
    },
    suppliers: {
      name: "",
      contact_person: "",
      phone: "",
      whatsapp: "",
      address: "",
      service_area: "کرمان",
      minimum_order: 0,
      delivery_hours: 24,
      delivery_fee: 0,
      active: true,
      notes: "",
    },
    offers: {
      supplier_id: data.suppliers[0]?.id || "",
      product_id: data.products[0]?.id || "",
      price: 1,
      unit: data.products[0]?.unit || "کیلوگرم",
      package_size: 1,
      minimum_quantity: 1,
      available: true,
      delivery_fee: 0,
      delivery_hours: 24,
    },
  };
  const specs: Record<typeof kind, Spec[]> = {
    products: [
      { key: "name", label: "نام کالا", required: true },
      {
        key: "category_id",
        label: "دسته‌بندی",
        type: "select",
        options: data.categories.map((c) => ({ value: c.id, label: c.name })),
      },
      { key: "brand", label: "برند" },
      {
        key: "unit",
        label: "واحد پایه",
        type: "select",
        options: ["کیلوگرم", "لیتر", "بطری", "بسته", "عدد", "گرم"].map((v) => ({
          value: v,
          label: v,
        })),
      },
      {
        key: "package_size",
        label: "اندازه بسته مرجع",
        type: "number",
        min: 0.01,
        step: "0.01",
      },
      { key: "description", label: "مشخصات کالا", type: "textarea" },
      { key: "active", label: "کالا فعال است", type: "checkbox" },
    ],
    suppliers: [
      { key: "name", label: "نام تأمین‌کننده", required: true },
      { key: "contact_person", label: "نام مسئول تماس" },
      { key: "phone", label: "شماره تماس" },
      { key: "whatsapp", label: "شماره واتس‌اپ" },
      { key: "address", label: "نشانی", type: "textarea" },
      { key: "service_area", label: "محدوده خدمت", required: true },
      {
        key: "minimum_order",
        label: "حداقل خرید (تومان)",
        type: "number",
        min: 0,
      },
      {
        key: "delivery_fee",
        label: "هزینه پایه ارسال (تومان)",
        type: "number",
        min: 0,
      },
      {
        key: "delivery_hours",
        label: "زمان تحویل (ساعت)",
        type: "number",
        min: 1,
      },
      { key: "notes", label: "یادداشت عملیاتی", type: "textarea" },
      { key: "active", label: "تأمین‌کننده فعال است", type: "checkbox" },
    ],
    offers: [
      {
        key: "supplier_id",
        label: "تأمین‌کننده",
        type: "select",
        options: data.suppliers.map((s) => ({ value: s.id, label: s.name })),
      },
      {
        key: "product_id",
        label: "کالا",
        type: "select",
        options: data.products.map((p) => ({ value: p.id, label: p.name })),
      },
      { key: "price", label: "قیمت هر بسته (تومان)", type: "number", min: 1 },
      {
        key: "unit",
        label: "واحد عرضه",
        type: "select",
        options: ["کیلوگرم", "لیتر", "بطری", "بسته", "عدد", "گرم"].map((v) => ({
          value: v,
          label: v,
        })),
      },
      {
        key: "package_size",
        label: "مقدار داخل هر بسته",
        type: "number",
        min: 0.01,
        step: "0.01",
      },
      {
        key: "minimum_quantity",
        label: "حداقل مقدار (واحد پایه)",
        type: "number",
        min: 0.01,
        step: "0.01",
      },
      {
        key: "delivery_fee",
        label: "حداقل هزینه ارسال این کالا (تومان)",
        type: "number",
        min: 0,
      },
      {
        key: "delivery_hours",
        label: "زمان تحویل (ساعت)",
        type: "number",
        min: 1,
      },
      { key: "available", label: "موجود و قابل عرضه است", type: "checkbox" },
    ],
  };
  const records = (data[table] as unknown as FormRecord[]).filter((r) =>
    normalize(
      String(
        r.name || data.products.find((p) => p.id === r.product_id)?.name || "",
      ) +
        " " +
        String(data.suppliers.find((s) => s.id === r.supplier_id)?.name || ""),
    ).includes(normalize(query)),
  );
  function update(key: string, value: string | number | boolean) {
    setRecord((r) => {
      if (!r) return r;
      const next = { ...r, [key]: value };
      if (key === "product_id")
        next.unit = data.products.find((p) => p.id === value)?.unit || "";
      return next;
    });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const draft = { ...record! };
      for (const spec of specs[kind]) {
        if (spec.required)
          z.string()
            .trim()
            .min(2, "نام یا اطلاعات ضروری را کامل کنید.")
            .parse(draft[spec.key]);
        if (spec.type === "number") {
          const check = z
            .number()
            .finite()
            .min(spec.min || 0)
            .max(100000000000);
          check.parse(draft[spec.key]);
          if (spec.step !== "0.01") z.number().int().parse(draft[spec.key]);
        }
      }
      const allowed = ["id", ...specs[kind].map((s) => s.key)];
      const clean = Object.fromEntries(
        Object.entries(draft).filter(([key]) => allowed.includes(key)),
      );
      await app.run("admin_save", { table, data: clean }, "اطلاعات ذخیره شد.");
      setRecord(null);
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? "مقادیر فرم معتبر نیستند. نام و عددهای مثبت را بررسی کنید."
          : (e as Error).message,
      );
    }
  }
  return (
    <>
      <PageTitle
        title={title}
        subtitle={
          kind === "offers"
            ? "زمان به‌روزرسانی با هر ذخیره به‌صورت خودکار ثبت می‌شود."
            : "اطلاعات عملیاتی را ایجاد، ویرایش یا غیرفعال کنید."
        }
        action={
          <Button
            onClick={() => {
              setRecord(defaults[kind]);
              setError("");
            }}
          >
            <Plus size={18} />
            {kind === "offers"
              ? "ثبت قیمت جدید"
              : kind === "products"
                ? "کالای جدید"
                : "تأمین‌کننده جدید"}
          </Button>
        }
      />
      <div className="toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="جست‌وجوی مدیریت"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جست‌وجو…"
          />
        </div>
        {kind === "products" && (
          <Button
            variant="secondary"
            onClick={() => setCategoryEdit({ name: "" })}
          >
            <Layers size={16} />
            دسته‌بندی جدید
          </Button>
        )}
      </div>
      <Panel>
        {records.length ? (
          <div className="table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>{kind === "offers" ? "کالا / تأمین‌کننده" : "نام"}</th>
                  <th>
                    {kind === "offers"
                      ? "قیمت بسته"
                      : kind === "products"
                        ? "واحد / برند"
                        : "حداقل خرید"}
                  </th>
                  <th>{kind === "offers" ? "زمان به‌روزرسانی" : "وضعیت"}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={String(r.id)}>
                    <td>
                      <strong>
                        {String(
                          r.name ||
                            data.products.find((p) => p.id === r.product_id)
                              ?.name,
                        )}
                      </strong>
                      {kind === "offers" && (
                        <small className="cell-sub">
                          {
                            data.suppliers.find((s) => s.id === r.supplier_id)
                              ?.name
                          }
                        </small>
                      )}
                    </td>
                    <td>
                      {kind === "offers" ? (
                        <>
                          {money(Number(r.price))}
                          <small className="cell-sub">
                            {number(Number(r.package_size))} {String(r.unit)} ·{" "}
                            {r.available ? "موجود" : "ناموجود"}
                          </small>
                        </>
                      ) : kind === "products" ? (
                        `${r.unit} · ${r.brand || "بدون برند"}`
                      ) : (
                        money(Number(r.minimum_order))
                      )}
                    </td>
                    <td>
                      {kind === "offers" ? (
                        date(String(r.updated_at), true)
                      ) : (
                        <Badge
                          request
                          status={r.active ? "approved" : "rejected"}
                        />
                      )}
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setRecord(r);
                          setError("");
                        }}
                        aria-label={`ویرایش ${String(r.name || data.products.find((p) => p.id === r.product_id)?.name)}`}
                      >
                        <Pencil size={15} />
                        ویرایش
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </Panel>
      {kind === "products" && (
        <Panel title="دسته‌بندی‌های کالا" className="section-space">
          <div
            className="panel-body"
            style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
          >
            {data.categories.map((c) => (
              <button
                className="filter-chip"
                key={c.id}
                onClick={() => setCategoryEdit({ id: c.id, name: c.name })}
              >
                {c.name} <Pencil size={12} style={{ display: "inline" }} />
              </button>
            ))}
          </div>
        </Panel>
      )}
      <Modal
        open={!!record}
        title={record?.id ? "ویرایش اطلاعات" : "ثبت اطلاعات جدید"}
        onClose={() => setRecord(null)}
      >
        <form onSubmit={submit} className="form-stack">
          <div className="form-grid">
            {specs[kind].map((spec) => (
              <Field label={spec.label} key={spec.key}>
                {spec.type === "select" ? (
                  <select
                    value={String(record?.[spec.key] || "")}
                    onChange={(e) => update(spec.key, e.target.value)}
                  >
                    {spec.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : spec.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={!!record?.[spec.key]}
                    onChange={(e) => update(spec.key, e.target.checked)}
                  />
                ) : spec.type === "textarea" ? (
                  <textarea
                    maxLength={1000}
                    value={String(record?.[spec.key] || "")}
                    onChange={(e) => update(spec.key, e.target.value)}
                  />
                ) : (
                  <input
                    required={spec.required || spec.type === "number"}
                    type={spec.type === "number" ? "number" : "text"}
                    min={spec.min}
                    step={spec.step || "1"}
                    max={spec.type === "number" ? 100000000000 : undefined}
                    maxLength={200}
                    value={(record?.[spec.key] as string | number) ?? ""}
                    onChange={(e) =>
                      update(
                        spec.key,
                        spec.type === "number"
                          ? e.target.valueAsNumber
                          : e.target.value,
                      )
                    }
                  />
                )}
              </Field>
            ))}
          </div>
          {kind === "offers" && (
            <Notice>
              قیمت مربوط به کل بسته است. برای مقایسه، مقدار سفارش باید مضرب
              اندازه بسته و واحد عرضه برابر واحد پایه کالا باشد. هزینه ارسال
              یک‌بار به‌ازای هر تأمین‌کننده، برابر بیشترین هزینه قابل اعمال است.
            </Notice>
          )}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" loading={app.busy}>
            ذخیره اطلاعات
          </Button>
        </form>
      </Modal>
      <Modal
        open={!!categoryEdit}
        title="دسته‌بندی کالا"
        onClose={() => setCategoryEdit(null)}
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void app
              .run(
                "admin_save",
                { table: "categories", data: categoryEdit },
                "دسته‌بندی ذخیره شد.",
              )
              .then(() => setCategoryEdit(null))
              .catch(() => {});
          }}
        >
          <Field label="نام دسته‌بندی">
            <input
              required
              minLength={2}
              maxLength={100}
              value={String(categoryEdit?.name || "")}
              onChange={(e) =>
                setCategoryEdit((c) => ({ ...c, name: e.target.value }))
              }
            />
          </Field>
          <Button type="submit" loading={app.busy}>
            ذخیره دسته‌بندی
          </Button>
        </form>
      </Modal>
    </>
  );
}
export function Customers() {
  const app = useApp();
  const [editing, setEditing] = useState<Business | null>(null);
  const [business, setBusiness] = useState("");
  const [user, setUser] = useState("");
  const [role, setRole] = useState("employee");
  if (!app.data) return null;
  const data = app.data;
  return (
    <>
      <PageTitle
        title="کسب‌وکارها و کاربران"
        subtitle="عضویت تیم‌ها و دسترسی کاربران پایلوت را مدیریت کنید."
      />
      <Panel>
        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>کسب‌وکار</th>
                <th>نوع / شهر</th>
                <th>اعضا</th>
                <th>تماس</th>
                <th>ویرایش</th>
              </tr>
            </thead>
            <tbody>
              {data.businesses.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.name}</strong>
                    <small className="cell-sub">{b.area}</small>
                  </td>
                  <td>
                    {b.type} · {b.city}
                  </td>
                  <td>
                    {number(
                      data.business_members.filter(
                        (m) => m.business_id === b.id,
                      ).length,
                    )}{" "}
                    عضو
                  </td>
                  <td dir="ltr">{b.phone || "ثبت نشده"}</td>
                  <td>
                    <Button
                      variant="ghost"
                      aria-label={`ویرایش ${b.name}`}
                      onClick={() => setEditing(b)}
                    >
                      <Pencil size={17} />
                      ویرایش
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Modal
        open={!!editing}
        title="ویرایش کسب‌وکار"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <BusinessForm
            key={editing.id}
            targetBusiness={editing}
            onSaved={() => setEditing(null)}
          />
        )}
      </Modal>
      <Panel title="افزودن یا تغییر نقش عضو" className="section-space">
        <form
          className="panel-body form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void app
              .run(
                "manage_member",
                { business_id: business, user_id: user, role },
                "عضویت تیم ذخیره شد.",
              )
              .catch(() => {});
          }}
        >
          <div className="form-grid">
            <Field label="کسب‌وکار">
              <select
                required
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
              >
                <option value="">انتخاب کسب‌وکار</option>
                {data.businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="کاربر ثبت‌نام‌شده">
              <select
                required
                value={user}
                onChange={(e) => setUser(e.target.value)}
              >
                <option value="">انتخاب کاربر</option>
                {data.profiles
                  .filter((p) => !["admin", "supplier"].includes(p.role))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || "کاربر جدید"} · {p.id.slice(0, 8)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="نقش">
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="employee">کارمند</option>
                <option value="buyer">مسئول خرید</option>
                <option value="manager">مدیر</option>
              </select>
            </Field>
          </div>
          <Notice>
            مالک کسب‌وکار قابل تغییر نیست. هر کاربر در این نسخه عضو یک کسب‌وکار
            است. نقش مدیر سامانه فقط از طریق تنظیم امن پایگاه داده تعیین می‌شود.
          </Notice>
          <Button loading={app.busy} type="submit">
            ذخیره عضویت
          </Button>
        </form>
      </Panel>
      <Panel title="کاربران ثبت‌شده" className="section-space">
        <div className="panel-body">
          {data.profiles.map((p) => (
            <div className="member-row" key={p.id}>
              <div>
                <strong>{p.full_name || "ثبت‌نام بدون تکمیل پروفایل"}</strong>
                <small
                  dir="ltr"
                  style={{ textAlign: "right", overflowWrap: "anywhere" }}
                >
                  {p.id}
                </small>
              </div>
              <small>
                {data.businesses.find(
                  (b) =>
                    b.id ===
                    data.business_members.find((m) => m.user_id === p.id)
                      ?.business_id,
                )?.name || "بدون عضویت کسب‌وکار"}
              </small>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
