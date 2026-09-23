"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, MapPin, Phone, Clock3 } from "lucide-react";
import { useApp } from "./provider";
import {
  Button,
  Empty,
  PageTitle,
  Panel,
  ProductIcon,
  Field,
  Modal,
  Notice,
} from "./ui";
import { date, money, normalize, number } from "@/lib/format";
import { canBuy } from "@/lib/domain";
import type { Product } from "@/lib/types";
export function Catalog() {
  const app = useApp();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [category, setCategory] = useState("");
  const [chosen, setChosen] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  if (!app.data) return null;
  const data = app.data;
  const products = data.products.filter(
    (p) =>
      p.active &&
      (!category || p.category_id === category) &&
      normalize(p.name + " " + p.brand + " " + p.description).includes(
        normalize(query),
      ),
  );
  async function add() {
    try {
      if (canBuy(app.role))
        await app.run(
          "edit_basket",
          {
            business_id: app.business!.id,
            action: "add",
            data: { product_id: chosen!.id, quantity },
          },
          "کالا به سبد اضافه شد.",
        );
      else
        await app.run(
          "create_material_request",
          {
            business_id: app.business!.id,
            data: {
              items: [{ product_id: chosen!.id, quantity, note: "" }],
              urgency: "normal",
              note: "",
            },
          },
          "درخواست کالا ثبت شد.",
        );
      setChosen(null);
    } catch {}
  }
  return (
    <>
      <PageTitle
        title="فهرست کالاها"
        subtitle="مواد اولیه و ملزومات کسب‌وکارتان را پیدا کنید."
      />
      <div className="toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="جست‌وجو در فهرست کالاها"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="نام کالا، برند یا مشخصات…"
          />
        </div>
        <select
          aria-label="دسته‌بندی کالا"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">همه دسته‌بندی‌ها</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="catalog-grid">
        {products.map((p) => {
          const offers = data.supplier_offers
            .filter(
              (o) =>
                o.product_id === p.id &&
                o.available &&
                o.unit === p.unit &&
                data.suppliers.some((s) => s.id === o.supplier_id && s.active),
            )
            .sort(
              (a, b) => a.price / a.package_size - b.price / b.package_size,
            );
          const best = offers[0];
          return (
            <Panel className="catalog-card" key={p.id}>
              <ProductIcon index={data.products.indexOf(p)} large />
              <h3>{p.name}</h3>
              <p className="description">{p.description}</p>
              <div className="product-meta">
                {p.brand || "بدون برند"} · واحد پایه: {p.unit}
              </div>
              <div className="price-line">
                <span className="muted">{best ? "قیمت واحد از" : "قیمت"}</span>
                <b>
                  {best
                    ? money(best.price / best.package_size)
                    : "نیازمند استعلام"}
                </b>
              </div>
              {best && (
                <small className="price-stamp">
                  به‌روزرسانی {date(best.updated_at, true)}
                </small>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setChosen(p);
                  setQuantity(1);
                }}
              >
                <Plus size={16} />
                {canBuy(app.role) ? "افزودن به سبد خرید" : "ثبت نیاز این کالا"}
              </Button>
            </Panel>
          );
        })}
      </div>
      {!products.length && (
        <Panel>
          <Empty
            title="کالایی پیدا نشد"
            text="عبارت جست‌وجو یا دسته‌بندی را تغییر دهید."
          />
        </Panel>
      )}
      <Modal
        open={!!chosen}
        title={chosen?.name || "افزودن کالا"}
        onClose={() => setChosen(null)}
      >
        <div className="form-stack">
          <Field label={`مقدار (${chosen?.unit})`}>
            <input
              type="number"
              min="0.01"
              max="100000"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.valueAsNumber || 0)}
            />
          </Field>
          <Notice>
            قیمت نهایی، حداقل مقدار و اندازه بسته هنگام مقایسه تأمین‌کنندگان
            بررسی می‌شود.
          </Notice>
          <Button loading={app.busy} onClick={() => void add()}>
            {canBuy(app.role) ? "افزودن به سبد" : "ثبت درخواست"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
export function Suppliers() {
  const { data, demo } = useApp();
  if (!data) return null;
  return (
    <>
      <PageTitle
        title="تأمین‌کنندگان"
        subtitle="محدوده خدمت و شرایط تأمین را پیش از خرید بررسی کنید."
      />
      {demo && (
        <div style={{ marginBottom: 22 }}>
          <Notice>
            نام‌ها و شرایط این صفحه داده نمایشی هستند و نماینده کسب‌وکار واقعی
            نیستند.
          </Notice>
        </div>
      )}
      <div className="supplier-grid">
        {data.suppliers
          .filter((s) => s.active)
          .map((s) => (
            <Panel key={s.id} className="supplier-card">
              <div className="supplier-heading">
                <span className="supplier-initial">{s.name.charAt(0)}</span>
                <div>
                  <h3>{s.name}</h3>
                  <p className="muted">{s.contact_person}</p>
                </div>
              </div>
              <div className="summary-row">
                <span>حداقل خرید</span>
                <strong>{money(s.minimum_order)}</strong>
              </div>
              <div className="summary-row">
                <span>هزینه پایه ارسال</span>
                <strong>
                  {s.delivery_fee ? money(s.delivery_fee) : "رایگان"}
                </strong>
              </div>
              <div className="summary-row">
                <span>
                  <Clock3 size={13} style={{ display: "inline" }} /> زمان تقریبی
                  تحویل
                </span>
                <strong>تا {number(s.delivery_hours)} ساعت</strong>
              </div>
              <div className="supplier-contact">
                <MapPin size={16} />
                {s.service_area}
              </div>
              <p className="muted" style={{ marginTop: 8 }}>
                {s.address}
              </p>
              {s.phone ? (
                <a className="supplier-contact" href={`tel:${s.phone}`}>
                  <Phone size={15} />
                  <bdi>{s.phone}</bdi>
                </a>
              ) : (
                <p className="muted" style={{ marginTop: 14 }}>
                  هماهنگی سفارش از طریق مدیر عملیات
                </p>
              )}
            </Panel>
          ))}
      </div>
    </>
  );
}
