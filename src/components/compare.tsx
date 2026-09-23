"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock3, SlidersHorizontal } from "lucide-react";
import { useApp } from "./provider";
import {
  ActionLink,
  Button,
  Empty,
  Field,
  Modal,
  Notice,
  PageTitle,
  Panel,
  Stepper,
} from "./ui";
import {
  compareSuppliers,
  offerProblem,
  selectedQuotes,
  optimizeBasket,
  type Criterion,
  type Quote,
} from "@/lib/domain";
import { date, money, number } from "@/lib/format";
import type { Selection } from "@/lib/types";
type Review = {
  quotes: Quote[];
  selections: (Selection & { updated_at: string })[];
  basketVersion: string;
  checkoutId: string;
  total: number;
};
export function Compare() {
  const app = useApp();
  const router = useRouter();
  const [criterion, setCriterion] = useState<Criterion>("cost");
  const [split, setSplit] = useState(false);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Review | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [address, setAddress] = useState(app.business?.address || "");
  const [error, setError] = useState("");
  if (!app.data) return null;
  const data = app.data;
  const basket = data.procurement_baskets.find(
    (b) => b.business_id === app.business?.id,
  );
  const items = data.basket_items.filter((i) => i.basket_id === basket?.id);
  const quotes = compareSuppliers(items, data, criterion);
  const recommended = quotes.find((q) => q.eligible);
  const missing = items.filter(
    (item) =>
      !data.supplier_offers.some(
        (o) =>
          o.product_id === item.product_id &&
          !offerProblem(item, o, data) &&
          data.suppliers.some((s) => s.id === o.supplier_id && s.active),
      ),
  );
  function openReview(selections: Selection[]) {
    try {
      const selected = selectedQuotes(items, selections, data);
      setReview({
        quotes: selected,
        selections: selections.map((s) => ({
          ...s,
          updated_at: data.supplier_offers.find((o) => o.id === s.offer_id)!
            .updated_at,
        })),
        basketVersion: basket!.updated_at,
        checkoutId: crypto.randomUUID(),
        total: selected.reduce((sum, q) => sum + q.total, 0),
      });
      setConfirmed(false);
      setError("");
      setNote(basket?.note || "");
      setAddress(app.business?.address || "");
    } catch (e) {
      app.notify((e as Error).message, "error");
    }
  }
  async function submit() {
    if (!review || !confirmed) return;
    setError("");
    try {
      const ids = (await app.run(
        "checkout",
        {
          business_id: app.business!.id,
          selections: review.selections,
          expected_total: review.total,
          basket_updated_at: review.basketVersion,
          checkout_id: review.checkoutId,
          note,
          address,
        },
        "سفارش ثبت شد؛ وضعیت تأیید تأمین‌کننده را پیگیری کنید.",
      )) as string[];
      setReview(null);
      router.push(ids.length === 1 ? `/app/orders/${ids[0]}` : "/app/orders");
    } catch (e) {
      setError((e as Error).message);
      void app.reload();
    }
  }
  return (
    <>
      <PageTitle
        title="مقایسه تأمین‌کنندگان"
        subtitle="یک سبد، چند گزینه؛ با دیدن هزینه و شرایط تصمیم بگیرید."
      />
      <Stepper step={review ? 2 : 1} />
      {!items.length ? (
        <Panel>
          <Empty
            title="برای مقایسه، ابتدا سبد را بسازید"
            action={<ActionLink href="/app/cart">رفتن به سبد خرید</ActionLink>}
          />
        </Panel>
      ) : (
        <>
          <div className="comparison-criteria">
            <span>{number(items.length)} قلم در سبد · قیمت‌ها به تومان</span>
            <div className="criterion-buttons">
              {(
                [
                  ["cost", "کمترین هزینه"],
                  ["speed", "تحویل سریع‌تر"],
                  ["single", "تأمین‌کننده کمتر"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={`filter-chip ${criterion === key ? "active" : ""}`}
                  onClick={() => setCriterion(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="section-space">
            <Notice>
              {criterion === "single"
                ? "این گزینه‌ها کل سبد را از یک تأمین‌کننده بررسی می‌کنند؛ یعنی یک هماهنگی و یک تحویل."
                : criterion === "speed"
                  ? "گزینه‌های قابل تأمین بر اساس زمان اعلام‌شده و سپس مبلغ نهایی مرتب شده‌اند."
                  : "گزینه‌های قابل تأمین بر اساس مبلغ کل با احتساب ارسال مرتب شده‌اند."}{" "}
              موجودی و زمان تحویل پس از بررسی تأمین‌کننده تأیید می‌شود.
            </Notice>
          </div>
          {!!missing.length && (
            <div className="section-space">
              <Notice kind="warning">
                این اقلام پیشنهاد قابل سفارش ندارند:{" "}
                {missing
                  .map(
                    (i) =>
                      data.products.find((p) => p.id === i.product_id)?.name,
                  )
                  .join("، ")}
                . مقدار و اندازه بسته را در سبد اصلاح کنید، یا قلم را حذف کنید
                تا بقیه خرید ادامه پیدا کند.{" "}
                <Link href="/app/cart" className="text-link">
                  ویرایش سبد
                </Link>
              </Notice>
            </div>
          )}
          <div className="section-space">
            <Button
              disabled={!!missing.length}
              onClick={() => {
                const optimized = optimizeBasket(items, data, criterion);
                if (!optimized.feasible) {
                  app.notify(
                    "ترکیب قابل سفارشی با رعایت حداقل خرید پیدا نشد. مقدار سبد یا انتخاب تأمین‌کنندگان را تغییر دهید.",
                    "error",
                  );
                  return;
                }
                openReview(optimized.selections);
                app.notify(
                  optimized.complete
                    ? "پیشنهاد سبد با احتساب ارسال و حداقل خرید محاسبه شد."
                    : "پیشنهاد از میان ترکیب‌های بررسی‌شده است؛ بهینه‌بودن قطعی نیست.",
                );
              }}
            >
              پیشنهاد سبد با این معیار
              <ArrowLeft size={16} />
            </Button>
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              ترکیب تأمین‌کنندگان، ارسال و حداقل خرید با هم بررسی می‌شوند.
              انتخاب نهایی با شماست.
            </p>
          </div>
          <div className="compare-grid">
            {quotes.map((q) => (
              <Panel
                key={q.supplier.id}
                className={`quote-card ${q === recommended ? "recommended" : ""}`}
              >
                {q === recommended && (
                  <span className="recommend-label">
                    گزینه پیشنهادی بر اساس اطلاعات موجود
                  </span>
                )}
                <div className="supplier-heading">
                  <span className="supplier-initial">
                    {q.supplier.name.charAt(0)}
                  </span>
                  <div>
                    <h3>{q.supplier.name}</h3>
                    <small className="muted">{q.supplier.service_area}</small>
                  </div>
                </div>
                <small className="muted">
                  {q.covered === items.length
                    ? "مبلغ نهایی با ارسال"
                    : "مبلغ اقلام قابل تأمین با ارسال"}
                </small>
                <div className="quote-total">
                  {number(q.total)}
                  <small>تومان</small>
                </div>
                <div className="summary-row">
                  <span>مبلغ کالاها</span>
                  <strong>{money(q.subtotal)}</strong>
                </div>
                <div className="summary-row">
                  <span>هزینه ارسال</span>
                  <strong>{q.shipping ? money(q.shipping) : "رایگان"}</strong>
                </div>
                <div className="summary-row">
                  <span>حداقل خرید</span>
                  <strong>{money(q.supplier.minimum_order)}</strong>
                </div>
                <div className="summary-row">
                  <span>زمان تقریبی تحویل</span>
                  <strong>تا {number(q.hours)} ساعت</strong>
                </div>
                <div className="summary-row">
                  <span>اقلام قابل تأمین</span>
                  <strong>
                    {number(q.covered)} از {number(items.length)} قلم
                  </strong>
                </div>
                <details style={{ marginTop: 14 }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      fontSize: 12,
                      color: "var(--blue)",
                      minHeight: 36,
                    }}
                  >
                    جزئیات قیمت اقلام
                  </summary>
                  {q.items.map((l) => (
                    <div
                      className={`offer-line ${l.problem ? "unavailable" : ""}`}
                      key={l.item.id}
                    >
                      <span>
                        {
                          data.products.find((p) => p.id === l.item.product_id)
                            ?.name
                        }
                        <small style={{ display: "block", fontSize: 10 }}>
                          {number(l.item.quantity)} {l.offer?.unit}{" "}
                          {l.offer
                            ? `· بسته ${number(l.offer.package_size)} واحدی`
                            : ""}
                        </small>
                        {l.offer && (
                          <small
                            className="muted"
                            style={{ display: "block", fontSize: 10 }}
                          >
                            به‌روزرسانی {date(l.offer.updated_at, true)}
                          </small>
                        )}
                      </span>
                      <b>{l.problem || money(l.total)}</b>
                    </div>
                  ))}
                </details>
                <p className="quote-reason">
                  {!q.eligible
                    ? q.covered < items.length
                      ? "بخشی از اقلام قابل تأمین نیست؛ این گزینه سبد کامل شما را پوشش نمی‌دهد."
                      : "مبلغ کالاها به حداقل خرید این تأمین‌کننده نمی‌رسد."
                    : criterion === "speed"
                      ? "زمان تحویل اعلام‌شده را با نیاز شیفتتان تطبیق دهید."
                      : criterion === "single"
                        ? "تمام اقلام سبد از یک تأمین‌کننده تأمین می‌شود."
                        : q === recommended
                          ? "این گزینه با احتساب ارسال، مبلغ کل کمتری در میان گزینه‌های کامل دارد."
                          : "تمام اقلام سبد با مبلغ و شرایط بالا قابل سفارش است."}
                </p>
                <p className="quote-stamp">
                  <Clock3 size={12} style={{ display: "inline" }} /> قدیمی‌ترین
                  قیمت: {q.updated_at ? date(q.updated_at, true) : "نامشخص"}
                </p>
                {q.stale && (
                  <p
                    className="error-text"
                    style={{ fontSize: 10, marginTop: 5 }}
                  >
                    قیمت بیش از ۷۲ ساعت پیش ثبت شده؛ نیازمند تأیید است.
                  </p>
                )}
                <Button
                  variant={q === recommended ? "primary" : "secondary"}
                  disabled={!q.eligible}
                  onClick={() =>
                    openReview(
                      q.items.map((l) => ({
                        basket_item_id: l.item.id,
                        offer_id: l.offer!.id,
                      })),
                    )
                  }
                >
                  انتخاب و بازبینی
                  <ArrowLeft size={16} />
                </Button>
              </Panel>
            ))}
          </div>
          <div className="section-space">
            <Button variant="secondary" onClick={() => setSplit(!split)}>
              <SlidersHorizontal size={16} />
              {split ? "بستن انتخاب جداگانه" : "انتخاب تأمین‌کننده برای هر قلم"}
            </Button>
          </div>
          {split && (
            <Panel
              className="section-space"
              title="تقسیم سبد بین تأمین‌کنندگان"
            >
              <div className="panel-body">
                <Notice>
                  برای هر تأمین‌کننده، هزینه ارسال و حداقل خرید جداگانه محاسبه
                  می‌شود.
                </Notice>
                <div className="form-stack section-space">
                  {items.map((item) => (
                    <Field
                      key={item.id}
                      label={`${data.products.find((p) => p.id === item.product_id)?.name} · ${number(item.quantity)} ${data.products.find((p) => p.id === item.product_id)?.unit}`}
                    >
                      <select
                        value={choices[item.id] || ""}
                        onChange={(e) =>
                          setChoices((c) => ({
                            ...c,
                            [item.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">انتخاب تأمین‌کننده</option>
                        {data.supplier_offers
                          .filter(
                            (o) =>
                              o.product_id === item.product_id &&
                              data.suppliers.some(
                                (s) => s.id === o.supplier_id && s.active,
                              ),
                          )
                          .map((o) => {
                            const problem = offerProblem(item, o, data);
                            return (
                              <option
                                key={o.id}
                                value={o.id}
                                disabled={!!problem}
                              >
                                {
                                  data.suppliers.find(
                                    (s) => s.id === o.supplier_id,
                                  )?.name
                                }{" "}
                                ·{" "}
                                {problem ||
                                  money(
                                    (item.quantity / o.package_size) * o.price,
                                  )}
                                {" · به‌روزرسانی "}
                                {date(o.updated_at)}
                              </option>
                            );
                          })}
                      </select>
                    </Field>
                  ))}
                  <Button
                    onClick={() =>
                      openReview(
                        items.map((i) => ({
                          basket_item_id: i.id,
                          offer_id: choices[i.id],
                        })),
                      )
                    }
                  >
                    محاسبه و بازبینی خرید
                  </Button>
                </div>
              </div>
            </Panel>
          )}
        </>
      )}
      <Modal
        open={!!review}
        title="بازبینی و تأیید سفارش"
        onClose={() => {
          if (!app.busy) setReview(null);
        }}
      >
        {review && (
          <div className="form-stack">
            <Notice>
              ثبت سفارش به معنی پرداخت یا تأیید قطعی موجودی نیست. بعد از ثبت،
              منتظر بررسی تأمین‌کننده بمانید.
            </Notice>
            <div>
              {review.quotes.map((q) => (
                <div className="review-group" key={q.supplier.id}>
                  <h3>{q.supplier.name}</h3>
                  <p className="quote-stamp">
                    قدیمی‌ترین قیمت:{" "}
                    {q.updated_at ? date(q.updated_at, true) : "نامشخص"}
                    {q.stale
                      ? " · بیش از ۷۲ ساعت؛ نیازمند تأیید تأمین‌کننده"
                      : ""}
                  </p>
                  {q.items.map((l) => (
                    <div className="review-line" key={l.item.id}>
                      <span>
                        {
                          data.products.find((p) => p.id === l.item.product_id)
                            ?.name
                        }{" "}
                        · {number(l.item.quantity)} {l.offer?.unit}
                      </span>
                      <strong>{money(l.total)}</strong>
                    </div>
                  ))}
                  <div className="summary-row">
                    <span>ارسال</span>
                    <strong>{money(q.shipping)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>بازه تقریبی تحویل</span>
                    <strong>تا {number(q.hours)} ساعت پس از تأیید</strong>
                  </div>
                  <div className="summary-row">
                    <span>جمع این تأمین‌کننده</span>
                    <strong>{money(q.total)}</strong>
                  </div>
                </div>
              ))}
            </div>
            <div className="summary-row total">
              <span>مبلغ نهایی {number(review.quotes.length)} سفارش</span>
              <strong>{money(review.total)}</strong>
            </div>
            <Field label="نشانی دقیق تحویل">
              <textarea
                required
                minLength={5}
                maxLength={500}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
            <Field label="توضیحات تحویل">
              <input
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                اقلام، مقدار، تأمین‌کننده، هزینه ارسال و مبلغ نهایی را بررسی و
                تأیید می‌کنم.
              </span>
            </label>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <Button
              loading={app.busy}
              disabled={!confirmed || address.trim().length < 5}
              onClick={() => void submit()}
            >
              <Check size={18} />
              ثبت نهایی سفارش
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
