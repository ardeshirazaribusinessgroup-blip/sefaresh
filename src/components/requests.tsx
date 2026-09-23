"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  Clock3,
  User,
  Check,
  ShoppingBasket,
  X,
} from "lucide-react";
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
  ProductIcon,
} from "./ui";
import { date, normalize, number } from "@/lib/format";
import { canBuy } from "@/lib/domain";
import type { RequestDraft } from "@/lib/types";
export function Requests({ admin = false }: { admin?: boolean }) {
  const app = useApp();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  if (!app.data) return null;
  const data = app.data;
  const requests = data.material_requests
    .filter(
      (r) =>
        (admin || r.business_id === app.business?.id) &&
        (app.role !== "employee" || r.requested_by === app.userId),
    )
    .filter(
      (r) =>
        tab === "all" ||
        (tab === "pending"
          ? ["submitted", "reviewing"].includes(r.status)
          : r.status === tab),
    )
    .filter(
      (r) =>
        !search ||
        data.material_request_items.some(
          (i) =>
            i.request_id === r.id &&
            normalize(
              data.products.find((p) => p.id === i.product_id)?.name || "",
            ).includes(normalize(search)),
        ),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <PageTitle
        title={
          app.role === "employee" ? "درخواست‌های من" : "درخواست‌های مواد اولیه"
        }
        subtitle="نیازهای تیم را بررسی کنید و اقلام تأییدشده را به خرید برسانید."
        action={
          <ActionLink href="/app/requests/new">
            <Plus size={18} />
            ثبت درخواست جدید
          </ActionLink>
        }
      />
      <div className="tabs">
        {[
          ["all", "همه درخواست‌ها"],
          ["pending", "منتظر بررسی"],
          ["approved", "تأییدشده"],
          ["in_basket", "در سبد خرید"],
          ["purchased", "خریداری‌شده"],
          ["rejected", "ردشده"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            placeholder="جست‌وجوی نام کالا…"
            aria-label="جست‌وجوی درخواست"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="muted">{number(requests.length)} درخواست</span>
      </div>
      <Panel>
        {requests.length ? (
          requests.map((r) => {
            const items = data.material_request_items.filter(
              (i) => i.request_id === r.id,
            );
            const p = data.products.find((p) => p.id === items[0]?.product_id);
            const author = data.profiles.find((p) => p.id === r.requested_by);
            return (
              <Link
                className="request-card"
                key={r.id}
                href={`${admin ? "/admin" : "/app"}/requests/${r.id}`}
              >
                <ProductIcon index={p ? data.products.indexOf(p) : 0} />
                <div className="body">
                  <h3>
                    {p?.name}
                    {items.length > 1
                      ? " و " + number(items.length - 1) + " قلم دیگر"
                      : ""}
                  </h3>
                  <div className="meta">
                    <span>{author?.full_name}</span>
                    <span>{date(r.created_at, true)}</span>
                    {r.urgency === "urgent" && <b className="urgency">فوری</b>}
                    {admin && (
                      <span>
                        {
                          data.businesses.find((b) => b.id === r.business_id)
                            ?.name
                        }
                      </span>
                    )}
                  </div>
                </div>
                <Badge request status={r.status} />
                <span className="icon-button">
                  <ArrowLeft size={19} />
                </span>
              </Link>
            );
          })
        ) : (
          <Empty
            title="درخواستی با این شرایط پیدا نشد"
            text="فیلتر را تغییر دهید یا نیاز تازه‌ای ثبت کنید."
            action={
              <ActionLink href="/app/requests/new">ثبت درخواست</ActionLink>
            }
          />
        )}
      </Panel>
    </>
  );
}
export function NewRequest({ editId }: { editId?: string }) {
  const app = useApp();
  const router = useRouter();
  const original = app.data?.material_requests.find(
    (r) =>
      r.id === editId &&
      (app.role === "admin" || r.business_id === app.business?.id) &&
      (canBuy(app.role) || r.requested_by === app.userId),
  );
  const [draft, setDraft] = useState<RequestDraft>(() =>
    original
      ? {
          items: app
            .data!.material_request_items.filter((i) => i.request_id === editId)
            .map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
              note: i.note,
            })),
          urgency: original.urgency,
          note: original.note,
        }
      : {
          items: [{ product_id: "", quantity: 1, note: "" }],
          urgency: "normal",
          note: "",
        },
  );
  const [error, setError] = useState("");
  if (!app.data) return null;
  if (
    editId &&
    (!original || !["submitted", "reviewing"].includes(original.status))
  )
    return (
      <Empty
        title="این درخواست قابل ویرایش نیست"
        action={
          <ActionLink href="/app/requests">بازگشت به درخواست‌ها</ActionLink>
        }
      />
    );
  const products = app.data.products.filter((p) => p.active);
  function change(index: number, key: string, value: string | number) {
    setDraft((d) => ({
      ...d,
      items: d.items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const id = await app.run(
        editId ? "edit_material_request" : "create_material_request",
        editId
          ? { id: editId, data: draft }
          : { business_id: app.business!.id, data: draft },
        editId
          ? "درخواست ویرایش شد و در انتظار بررسی است."
          : "درخواست ثبت شد و در انتظار بررسی است.",
      );
      router.push(`/app/requests/${id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        title={editId ? "ویرایش درخواست" : "ثبت درخواست مواد اولیه"}
        subtitle="چه چیزی نیاز دارید؟ مقدار و واحد را مشخص کنید."
      />
      <Panel>
        <form onSubmit={submit} className="panel-body">
          <h2 style={{ marginBottom: 22 }}>اقلام موردنیاز</h2>
          <div className="request-lines">
            {draft.items.map((item, i) => (
              <div className="request-line" key={i}>
                <Field label={`کالای ${number(i + 1)}`}>
                  <select
                    required
                    aria-label={`کالای ${number(i + 1)}`}
                    value={item.product_id}
                    onChange={(e) => change(i, "product_id", e.target.value)}
                  >
                    <option value="">انتخاب کالا</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.brand ? "· " + p.brand : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="مقدار">
                  <input
                    type="number"
                    aria-label={`مقدار ${number(i + 1)}`}
                    min="0.01"
                    max="100000"
                    step="0.01"
                    required
                    value={item.quantity}
                    onChange={(e) =>
                      change(i, "quantity", e.target.valueAsNumber || 0)
                    }
                  />
                </Field>
                <span className="unit-label">
                  {products.find((p) => p.id === item.product_id)?.unit ||
                    "واحد"}
                </span>
                <div className="line-note">
                  <Field label="توضیح (اختیاری)">
                    <input
                      value={item.note}
                      onChange={(e) => change(i, "note", e.target.value)}
                      maxLength={500}
                      placeholder="مثلاً نوع ترکیب یا بسته‌بندی"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`حذف قلم ${number(i + 1)}`}
                  disabled={draft.items.length === 1}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      items: d.items.filter((_, index) => index !== i),
                    }))
                  }
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                items: [...d.items, { product_id: "", quantity: 1, note: "" }],
              }))
            }
            disabled={draft.items.length >= 50}
          >
            <Plus size={17} />
            افزودن کالای دیگر
          </Button>
          <div className="form-grid section-space">
            <Field label="فوریت درخواست">
              <select
                value={draft.urgency}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    urgency: e.target.value as "normal" | "urgent",
                  }))
                }
              >
                <option value="normal">عادی · خرید برنامه‌ریزی‌شده</option>
                <option value="urgent">فوری · نیاز شیفت جاری</option>
              </select>
            </Field>
            <Field label="یادداشت برای مسئول خرید">
              <input
                maxLength={1000}
                value={draft.note}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, note: e.target.value }))
                }
                placeholder="نکته‌ای برای هماهنگی بهتر…"
              />
            </Field>
          </div>
          {error && (
            <p role="alert" className="error-text section-space">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button type="submit" loading={app.busy}>
              <Check size={18} />
              ثبت {number(draft.items.length)} قلم درخواست
            </Button>
            <ActionLink secondary href="/app/requests">
              انصراف
            </ActionLink>
          </div>
        </form>
      </Panel>
      <div className="section-space">
        <Notice>
          ثبت نیاز، سفارش خرید نیست. مسئول خرید درخواست را بررسی و در صورت تأیید
          به سبد اضافه می‌کند.
        </Notice>
      </div>
    </>
  );
}
export function RequestDetail({ id }: { id: string }) {
  const app = useApp();
  const router = useRouter();
  if (!app.data) return null;
  const data = app.data;
  const request = data.material_requests.find(
    (r) =>
      r.id === id &&
      (app.role === "admin" || r.business_id === app.business?.id) &&
      (app.role !== "employee" || r.requested_by === app.userId),
  );
  if (!request)
    return (
      <Empty
        title="درخواست پیدا نشد یا به آن دسترسی ندارید"
        action={
          <ActionLink href="/app/requests">بازگشت به درخواست‌ها</ActionLink>
        }
      />
    );
  const items = data.material_request_items.filter((i) => i.request_id === id);
  const pending = ["submitted", "reviewing"].includes(request.status);
  return (
    <>
      <PageTitle
        title="جزئیات درخواست"
        subtitle={`${number(items.length)} قلم موردنیاز · ${date(request.created_at)}`}
        action={<div className="row-actions"><Badge request status={request.status} />{pending&&(canBuy(app.role)||request.requested_by===app.userId)&&<ActionLink secondary href={`/app/requests/${id}/edit`}>ویرایش درخواست</ActionLink>}</div>}
      />
      <div className="two-col">
        <Panel title="اقلام درخواست">
          <div className="panel-body">
            <div className="details-meta">
              <span>
                <User size={15} />
                {
                  data.profiles.find((p) => p.id === request.requested_by)
                    ?.full_name
                }
              </span>
              <span>
                <Clock3 size={15} />
                {date(request.created_at, true)}
              </span>
              {request.urgency === "urgent" && (
                <span className="urgency">فوری</span>
              )}
            </div>
            <div className="detail-list">
              {items.map((item) => {
                const p = data.products.find((p) => p.id === item.product_id)!;
                return (
                  <div key={item.id}>
                    <ProductIcon index={data.products.indexOf(p)} />
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {p.brand}
                        {item.note ? " · " + item.note : ""}
                      </small>
                    </div>
                    <span className="end">
                      {number(item.quantity)} {item.unit}
                    </span>
                  </div>
                );
              })}
            </div>
            {request.note && <Notice>{request.note}</Notice>}
          </div>
        </Panel>
        <Panel className="summary-panel">
          <h2>قدم بعدی</h2>
          {canBuy(app.role) && pending ? (
            <>
              <p className="muted">
                مقدار و مشخصات را بررسی کنید، سپس درباره درخواست تصمیم بگیرید.
              </p>
              <Button
                loading={app.busy}
                onClick={() =>
                  void app
                    .run(
                      "review_request",
                      { id, status: "approved" },
                      "درخواست تأیید شد.",
                    )
                    .catch(() => {})
                }
              >
                <Check size={18} />
                تأیید درخواست
              </Button>
              {request.status === "submitted" && (
                <Button
                  variant="secondary"
                  loading={app.busy}
                  onClick={() =>
                    void app
                      .run(
                        "review_request",
                        { id, status: "reviewing" },
                        "درخواست در حال بررسی است.",
                      )
                      .catch(() => {})
                  }
                >
                  شروع بررسی
                </Button>
              )}
              <Button
                variant="danger"
                loading={app.busy}
                onClick={() =>
                  void app
                    .run(
                      "review_request",
                      { id, status: "rejected" },
                      "درخواست رد شد.",
                    )
                    .catch(() => {})
                }
              >
                <X size={17} />
                رد درخواست
              </Button>
            </>
          ) : canBuy(app.role) &&
            ["approved", "in_basket"].includes(request.status) ? (
            <>
              <p className="muted">
                اقلام تأییدشده را به سبد اضافه کنید و شرایط تأمین را ببینید.
              </p>
              <Button
                loading={app.busy}
                onClick={() =>
                  void app
                    .run(
                      "add_request_to_basket",
                      { id },
                      "اقلام به سبد خرید اضافه شد.",
                    )
                    .then(() => router.push("/app/cart"))
                    .catch(() => {})
                }
              >
                <ShoppingBasket size={18} />
                افزودن به سبد خرید
              </Button>
            </>
          ) : (
            <Notice>
              {request.status === "purchased"
                ? "خرید این درخواست ثبت شده است."
                : request.status === "rejected"
                  ? "درخواست تأیید نشد. برای اصلاح، درخواست تازه‌ای ثبت کنید."
                  : "نتیجه بررسی مسئول خرید در همین صفحه نمایش داده می‌شود."}
            </Notice>
          )}
        </Panel>
      </div>
    </>
  );
}
