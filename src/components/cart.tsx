"use client";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Check } from "lucide-react";
import { useApp } from "./provider";
import {
  ActionLink,
  Button,
  Empty,
  Field,
  PageTitle,
  Panel,
  ProductIcon,
  Stepper,
} from "./ui";
import { compareSuppliers } from "@/lib/domain";
import { money, number, date } from "@/lib/format";
import type { BasketItem } from "@/lib/types";
function BasketRow({ item }: { item: BasketItem }) {
  const app = useApp();
  const [quantity, setQuantity] = useState(item.quantity);
  const [note, setNote] = useState(item.note);
  const p = app.data!.products.find((p) => p.id === item.product_id)!;
  const changed = quantity !== item.quantity || note !== item.note;
  return (
    <div className="basket-row">
      <ProductIcon index={app.data!.products.indexOf(p)} />
      <div className="product-details">
        <h3>{p.name}</h3>
        <small>
          {p.brand} · {p.unit}
          {!p.active ? " · غیرفعال" : ""}
        </small>
        <input
          className="note-input"
          aria-label={`توضیح ${p.name}`}
          value={note}
          maxLength={500}
          placeholder="توضیح این قلم…"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <input
        type="number"
        min="0.01"
        max="100000"
        step="0.01"
        aria-label={`مقدار ${p.name}`}
        value={quantity}
        onChange={(e) => setQuantity(e.target.valueAsNumber || 0)}
      />
      {changed && (
        <Button
          className="small"
          loading={app.busy}
          onClick={() =>
            void app
              .run(
                "edit_basket",
                {
                  business_id: app.business!.id,
                  action: "update",
                  data: { id: item.id, quantity, note },
                },
                "سبد به‌روز شد.",
              )
              .catch(() => {})
          }
        >
          <Check size={15} />
          ذخیره
        </Button>
      )}
      <button
        className="icon-button"
        disabled={app.busy}
        aria-label={`حذف ${p.name}`}
        onClick={() =>
          void app
            .run(
              "edit_basket",
              {
                business_id: app.business!.id,
                action: "remove",
                data: { id: item.id },
              },
              "قلم از سبد حذف شد.",
            )
            .catch(() => {})
        }
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
export function Cart() {
  const app = useApp();
  if (!app.data) return null;
  const basket = app.data.procurement_baskets.find(
    (b) => b.business_id === app.business?.id,
  );
  const items = app.data.basket_items.filter((i) => i.basket_id === basket?.id);
  const best = compareSuppliers(items, app.data, "cost").find(
    (q) => q.eligible,
  );
  return (
    <>
      <PageTitle
        title="سبد خرید"
        subtitle="مقدار و مشخصات اقلام را پیش از مقایسه بررسی کنید."
        action={
          <ActionLink secondary href="/app/products">
            <Plus size={17} />
            افزودن کالا
          </ActionLink>
        }
      />
      <Stepper step={0} />
      {!items.length ? (
        <Panel>
          <Empty
            title="سبد خرید شما هنوز خالی است"
            text="یک درخواست تأییدشده یا کالای جدید به سبد اضافه کنید."
            action={
              <ActionLink href="/app/requests">بررسی درخواست‌ها</ActionLink>
            }
          />
        </Panel>
      ) : (
        <div className="two-col">
          <Panel title={`${number(items.length)} قلم در سبد خرید`}>
            {items.map((item) => (
              <BasketRow item={item} key={item.id} />
            ))}
            <div className="panel-body">
              <BasketNote initial={basket?.note || ""} />
            </div>
          </Panel>
          <Panel className="summary-panel">
            <h2>خلاصه سبد</h2>
            <div className="summary-row">
              <span>تعداد اقلام</span>
              <strong>{number(items.length)} قلم</strong>
            </div>
            <div className="summary-row">
              <span>تأمین‌کنندگان قابل مقایسه</span>
              <strong>
                {number(app.data.suppliers.filter((s) => s.active).length)}
              </strong>
            </div>
            <div className="summary-row total">
              <span>برآورد با ارسال</span>
              <strong>{best ? money(best.total) : "نیازمند مقایسه"}</strong>
            </div>
            {best && (
              <small className="muted">
                بر اساس قیمت {best.supplier.name}
                <br />
                به‌روزرسانی {date(best.updated_at!, true)}
              </small>
            )}
            <ActionLink href="/app/compare">
              مقایسه تأمین‌کنندگان
              <ArrowLeft size={17} />
            </ActionLink>
            <p className="muted" style={{ fontSize: 11, marginTop: 14 }}>
              مبلغ نهایی پس از انتخاب تأمین‌کننده و بازبینی مشخص می‌شود.
            </p>
          </Panel>
        </div>
      )}
    </>
  );
}
function BasketNote({ initial }: { initial: string }) {
  const app = useApp();
  const [note, setNote] = useState(initial);
  return (
    <>
      <Field label="یادداشت سبد (اختیاری)">
        <textarea
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="توضیحی برای تحویل یا هماهنگی خرید…"
        />
      </Field>
      {note !== initial && (
        <Button
          variant="ghost"
          loading={app.busy}
          onClick={() =>
            void app
              .run(
                "edit_basket",
                {
                  business_id: app.business!.id,
                  action: "note",
                  data: { note },
                },
                "یادداشت ذخیره شد.",
              )
              .catch(() => {})
          }
        >
          ذخیره یادداشت
        </Button>
      )}
    </>
  );
}
