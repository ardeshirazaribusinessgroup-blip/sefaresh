"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MapPin, Search, Truck } from "lucide-react";
import { useApp } from "./provider";
import {
  ActionLink,
  Badge,
  Button,
  Empty,
  Field,
  Notice,
  PageTitle,
  Panel,
} from "./ui";
import { date, money, normalize, number } from "@/lib/format";
import { canMoveOrder } from "@/lib/domain";
import { orderLabels, statusSteps, type OrderStatus } from "@/lib/types";
export function Orders({
  history = false,
  admin = false,
}: {
  history?: boolean;
  admin?: boolean;
}) {
  const app = useApp();
  const [status, setStatus] = useState("");
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  if (!app.data) return null;
  const data = app.data;
  const orders = data.orders
    .filter((o) =>
      admin || app.role === "supplier"
        ? admin || o.supplier_id === app.profile?.supplier_id
        : o.business_id === app.business?.id,
    )
    .filter(
      (o) =>
        (!status || o.status === status) &&
        (!supplier || o.supplier_id === supplier) &&
        (!from || o.created_at.slice(0, 10) >= from) &&
        (!to || o.created_at.slice(0, 10) <= to),
    )
    .filter(
      (o) =>
        !category ||
        data.order_items.some(
          (i) =>
            i.order_id === o.id &&
            data.products.find((p) => p.id === i.product_id)?.category_id ===
              category,
        ),
    )
    .filter(
      (o) =>
        !query ||
        normalize(String(o.number)).includes(normalize(query)) ||
        number(o.number).includes(query) ||
        data.order_items.some(
          (i) =>
            i.order_id === o.id &&
            normalize(i.product_name).includes(normalize(query)),
        ),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <PageTitle
        title={history ? "سابقه خرید" : "سفارش‌ها"}
        subtitle={
          history
            ? "خریدهای ثبت‌شده را بر اساس تاریخ، کالا و تأمین‌کننده بررسی کنید."
            : "وضعیت هر خرید را از ثبت تا تحویل دنبال کنید."
        }
      />
      <div className="toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="جست‌وجوی سفارش"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="شماره سفارش یا نام کالا…"
          />
        </div>
        <select
          aria-label="وضعیت سفارش"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(orderLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="تأمین‌کننده سفارش"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
        >
          <option value="">همه تأمین‌کنندگان</option>
          {data.suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {history && (
        <Panel className="panel-body">
          <div
            className="form-grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            }}
          >
            <Field label="از تاریخ (میلادی)">
              <input
                type="date"
                aria-label="از تاریخ"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="تا تاریخ (میلادی)">
              <input
                type="date"
                min={from}
                aria-label="تا تاریخ"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
            <Field label="دسته‌بندی">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">همه دسته‌ها</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Panel>
      )}
      <div className="summary-row" style={{ margin: "12px 0" }}>
        <span>{number(orders.length)} سفارش</span>
        <span>
          جمع بدون لغوشده:{" "}
          <strong>
            {money(
              orders
                .filter((o) => o.status !== "cancelled")
                .reduce((sum, o) => sum + o.total, 0),
            )}
          </strong>
        </span>
      </div>
      <Panel>
        {orders.length ? (
          <div className="table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>شماره سفارش</th>
                  <th>تاریخ ثبت</th>
                  <th>تأمین‌کننده</th>
                  {admin && <th>کسب‌وکار</th>}
                  <th>مبلغ نهایی (تومان)</th>
                  <th>وضعیت</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link
                        className="order-number"
                        href={`${admin ? "/admin" : "/app"}/orders/${o.id}`}
                      >
                        #{number(o.number)}
                      </Link>
                    </td>
                    <td>{date(o.created_at)}</td>
                    <td>
                      {data.suppliers.find((s) => s.id === o.supplier_id)?.name}
                    </td>
                    {admin && (
                      <td>
                        {
                          data.businesses.find((b) => b.id === o.business_id)
                            ?.name
                        }
                      </td>
                    )}
                    <td className="numeric">{number(o.total)}</td>
                    <td>
                      <Badge status={o.status} />
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={`${admin ? "/admin" : "/app"}/orders/${o.id}`}
                      >
                        جزئیات
                        <ArrowLeft size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="سفارشی با این شرایط وجود ندارد"
            text="فیلترها را تغییر دهید یا اولین خرید را از سبد شروع کنید."
            action={
              !admin && app.role !== "supplier" ? (
                <ActionLink href="/app/cart">سبد خرید</ActionLink>
              ) : undefined
            }
          />
        )}
      </Panel>
    </>
  );
}
export function OrderDetail({ id }: { id: string }) {
  const app = useApp();
  const [nextStatus, setNextStatus] = useState("");
  const [note, setNote] = useState("");
  if (!app.data) return null;
  const data = app.data;
  const order = data.orders.find(
    (o) =>
      o.id === id &&
      (app.role === "admin" ||
        (app.role === "supplier"
          ? o.supplier_id === app.profile?.supplier_id
          : o.business_id === app.business?.id && app.role !== "employee")),
  );
  if (!order)
    return (
      <Empty
        title="سفارش پیدا نشد یا به آن دسترسی ندارید"
        action={<ActionLink href="/app/orders">بازگشت به سفارش‌ها</ActionLink>}
      />
    );
  const supplier = data.suppliers.find((s) => s.id === order.supplier_id)!;
  const items = data.order_items.filter((i) => i.order_id === id);
  const events = data.order_status_history
    .filter((e) => e.order_id === id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const operational = ["admin", "supplier"].includes(app.role);
  const allowed = Object.keys(orderLabels).filter((s) =>
    canMoveOrder(order.status, s as OrderStatus),
  );
  return (
    <>
      <PageTitle
        title={`سفارش #${number(order.number)}`}
        subtitle={`${supplier.name} · ثبت ${date(order.created_at, true)}`}
        action={<Badge status={order.status} />}
      />
      <div className="two-col">
        <div>
          <Panel title="اقلام سفارش">
            <div className="panel-body">
              {items.map((item) => (
                <div className="review-group" key={item.id}>
                  <div className="review-line">
                    <strong>{item.product_name}</strong>
                    <strong>{money(item.total)}</strong>
                  </div>
                  <div className="review-line">
                    <span className="muted">
                      {number(item.quantity)} {item.unit} ×{" "}
                      {money(item.unit_price)}
                    </span>
                  </div>
                  <small className="muted">
                    قیمت ثبت‌شده در زمان خرید · به‌روزرسانی{" "}
                    {date(item.offer_updated_at, true)}
                  </small>
                  {item.note && <p className="muted">{item.note}</p>}
                </div>
              ))}
              <div className="summary-row">
                <span>مبلغ کالاها</span>
                <strong>{money(order.subtotal)}</strong>
              </div>
              <div className="summary-row">
                <span>ارسال</span>
                <strong>{money(order.delivery_fee)}</strong>
              </div>
              <div className="summary-row total">
                <span>مبلغ نهایی</span>
                <strong>{money(order.total)}</strong>
              </div>
            </div>
          </Panel>
          <Panel title="اطلاعات تحویل" className="section-space">
            <div className="panel-body">
              <div className="details-meta">
                <span>
                  <MapPin size={16} />
                  {order.address}
                </span>
                <span>
                  <Truck size={16} />
                  زمان تقریبی: تا {number(order.delivery_hours)} ساعت پس از
                  تأیید
                </span>
              </div>
              {order.note && <p>{order.note}</p>}
              <Notice>
                این سامانه پرداخت انجام نمی‌دهد. برای هماهنگی شرایط تسویه، مدیر
                عملیات سفارش را بررسی می‌کند.
              </Notice>
            </div>
          </Panel>
          {operational && allowed.length > 0 && (
            <Panel title="ثبت تغییر وضعیت" className="section-space">
              <form
                className="panel-body form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  void app
                    .run(
                      "change_order_status",
                      { id, status: nextStatus || allowed[0], note },
                      "وضعیت و سابقه سفارش به‌روز شد.",
                    )
                    .then(() => {
                      setNextStatus("");
                      setNote("");
                    })
                    .catch(() => {});
                }}
              >
                <Field label="وضعیت جدید">
                  <select
                    value={nextStatus || allowed[0]}
                    onChange={(e) => setNextStatus(e.target.value)}
                  >
                    {allowed.map((s) => (
                      <option key={s} value={s}>
                        {orderLabels[s as OrderStatus]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="توضیح تغییر (برای لغو الزامی است)">
                  <input
                    maxLength={1000}
                    required={(nextStatus || allowed[0]) === "cancelled"}
                    minLength={
                      (nextStatus || allowed[0]) === "cancelled" ? 3 : 0
                    }
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Field>
                <Button loading={app.busy} type="submit">
                  ثبت وضعیت جدید
                </Button>
              </form>
            </Panel>
          )}
        </div>
        <Panel title="مسیر سفارش">
          <div className="timeline">
            {(order.status === "cancelled"
              ? [...events.map((e) => e.status)]
              : statusSteps
            ).map((status, index) => {
              const ev = events.find((e) => e.status === status);
              return (
                <div
                  key={status + index}
                  className={`timeline-event ${ev ? "complete" : ""} ${order.status === status ? "current" : ""}`}
                >
                  <h3>{orderLabels[status]}</h3>
                  {ev ? (
                    <>
                      <small>
                        {date(ev.created_at, true)} · {ev.actor_name}
                      </small>
                      {ev.note && <p>{ev.note}</p>}
                    </>
                  ) : (
                    <small>هنوز انجام نشده</small>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}
