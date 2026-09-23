"use client";
import {
  ArrowLeft,
  Plus,
  ShoppingBag,
  Wallet,
  Truck,
  ClipboardCheck,
  Clock3,
  ArrowUpLeft,
  CircleCheck,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBasket,
} from "lucide-react";
import Link from "next/link";
import { useApp } from "./provider";
import {
  ActionLink,
  Badge,
  Empty,
  PageTitle,
  Panel,
  ProductIcon,
  TextLink,
} from "./ui";
import {
  date,
  isThisPersianMonth,
  money,
  number,
  shortDate,
} from "@/lib/format";
import { canBuy } from "@/lib/domain";
export function Dashboard() {
  const { data, business, profile, role, userId } = useApp();
  if (!data) return null;
  const orders = data.orders
    .filter((o) =>
      role === "supplier"
        ? o.supplier_id === profile?.supplier_id
        : o.business_id === business?.id,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const requests = data.material_requests.filter(
    (r) =>
      r.business_id === business?.id &&
      (role !== "employee" || r.requested_by === userId),
  );
  const pending = requests.filter((r) =>
    ["submitted", "reviewing"].includes(r.status),
  );
  const open = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  );
  const monthly = orders.filter(
    (o) => isThisPersianMonth(o.created_at) && o.status !== "cancelled",
  );
  const priceChanges = data.supplier_offers
    .filter(
      (o) => o.previous_price && o.previous_price !== o.price && o.available,
    )
    .slice(0, 3);
  const employee = role === "employee";
  const supplier = role === "supplier";
  const basket = data.procurement_baskets.find(
    (b) => b.business_id === business?.id,
  );
  const hasBasketItems = data.basket_items.some(
    (i) => i.basket_id === basket?.id,
  );
  const nextHref = employee
    ? "/app/requests/new"
    : supplier
      ? "/app/orders"
      : pending.length
        ? "/app/requests"
        : hasBasketItems
          ? "/app/compare"
          : "/app/requests/new";
  const nextLabel = employee
    ? "نیاز امروز را ثبت کنید"
    : supplier
      ? "سفارش‌های دریافتی را ببینید"
      : pending.length
        ? "درخواست‌های منتظر را بررسی کنید"
        : hasBasketItems
          ? "گزینه‌های تأمین سبد را مقایسه کنید"
          : "اولین نیاز را ثبت کنید";
  const stats = employee
    ? [
        {
          label: "درخواست‌های من",
          value: number(requests.length),
          foot: "همه نیازهای ثبت‌شده",
          icon: ClipboardCheck,
          color: "blue",
        },
        {
          label: "منتظر بررسی",
          value: number(pending.length),
          foot: "در انتظار تصمیم مسئول خرید",
          icon: Clock3,
          color: "amber",
        },
        {
          label: "تأییدشده",
          value: number(
            requests.filter((r) => ["approved", "in_basket"].includes(r.status))
              .length,
          ),
          foot: "در مسیر خرید",
          icon: ShoppingBag,
          color: "green",
        },
        {
          label: "خریداری‌شده",
          value: number(
            requests.filter((r) => r.status === "purchased").length,
          ),
          foot: "ثبت سفارش انجام شده",
          icon: CircleCheck,
          color: "purple",
        },
      ]
    : [
        {
          label: supplier ? "سفارش‌های باز" : "منتظر بررسی",
          value: number(supplier ? open.length : pending.length),
          foot: supplier
            ? "در انتظار آماده‌سازی یا تحویل"
            : "درخواست نیازمند تصمیم شما",
          icon: ClipboardCheck,
          color: "amber",
        },
        {
          label: supplier ? "تحویل‌شده" : "سفارش‌های باز",
          value: number(
            supplier
              ? orders.filter((o) => o.status === "delivered").length
              : open.length,
          ),
          foot: supplier
            ? "سفارش‌های تکمیل‌شده"
            : open.some((o) => o.status === "shipped")
              ? "یک سفارش در مسیر تحویل"
              : "وضعیت سفارش‌ها را پیگیری کنید",
          icon: Truck,
          color: "purple",
        },
        {
          label: supplier ? "ارزش سفارش‌های این ماه" : "مبلغ خرید این ماه",
          value: number(monthly.reduce((sum, o) => sum + o.total, 0)),
          foot: "با احتساب هزینه ارسال",
          icon: Wallet,
          color: "green",
          unit: "تومان",
        },
        {
          label: supplier ? "سفارش‌های این ماه" : "خریدهای این ماه",
          value: number(monthly.length),
          foot: "سفارش ثبت‌شده در ماه جاری",
          icon: ShoppingBag,
          color: "blue",
        },
      ];
  return (
    <>
      <PageTitle
        title={
          employee
            ? "درخواست‌های شما، روشن و قابل پیگیری"
            : supplier
              ? "نمای کلی تأمین‌کننده"
              : "نمای کلی کسب‌وکار"
        }
        subtitle={
          date(new Date().toISOString()) + " · وضعیت خرید و کارهای پیش رو"
        }
        action={
          !supplier && (
            <ActionLink href="/app/requests/new">
              <Plus size={18} />
              ثبت درخواست جدید
            </ActionLink>
          )
        }
      />
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="eyebrow">
            <i />
            همراه خرید روزانه شما
          </span>
          <h2>
            سلام {profile?.full_name.split(" ")[0] || "دوست عزیز"}، به سفارش خوش
            آمدید<span>!</span>
          </h2>
          <p>
            {employee
              ? "نیازهای شیفتتان را ثبت کنید؛ نتیجه را همین‌جا ببینید."
              : supplier
                ? "سفارش‌های دریافتی و وضعیت آماده‌سازی را یک‌جا ببینید."
                : "نیازهای تیم، انتخاب تأمین‌کننده و پیگیری خرید؛ همه‌چیز اینجاست."}
          </p>
          <Link href={nextHref}>
            {nextLabel}
            <ArrowLeft size={18} />
          </Link>
        </div>
        <div className="welcome-art">
          <span className="art-orbit orbit-one" />
          <span className="art-orbit orbit-two" />
          <span className="float-tag">
            <CircleCheck size={16} />
            خرید روشن، کنترل ساده
          </span>
          <img src="/rosha.png" alt="روشا، همراه خرید سفارش" />
          <span className="art-spark">✦</span>
        </div>
      </section>
      <h2 className="section-label">در یک نگاه</h2>
      <div
        className={`stats-grid ${employee ? "employee-stats" : "buyer-stats"}`}
      >
        {stats.map((stat) => (
          <Panel
            className={`stat-card ${"unit" in stat ? "stat-card-amount" : ""}`}
            key={stat.label}
          >
            <div className="stat-top">
              <span>{stat.label}</span>
              <span className={`stat-icon ${stat.color}`}>
                <stat.icon size={20} />
              </span>
            </div>
            <div className="stat-value">
              {stat.value}
              {"unit" in stat && <small>{stat.unit}</small>}
            </div>
            <div className="stat-foot">{stat.foot}</div>
          </Panel>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel
          className="recent-orders"
          title={employee ? "آخرین درخواست‌های من" : "آخرین سفارش‌ها"}
          action={
            <TextLink href={employee ? "/app/requests" : "/app/orders"}>
              مشاهده همه
            </TextLink>
          }
        >
          {employee ? (
            <div className="request-mini-list">
              {requests.slice(0, 4).map((r) => (
                <Link href={`/app/requests/${r.id}`} key={r.id}>
                  <ClipboardCheck size={21} />
                  <span>
                    <strong>
                      {data.material_request_items
                        .filter((i) => i.request_id === r.id)
                        .map(
                          (i) =>
                            data.products.find((p) => p.id === i.product_id)
                              ?.name,
                        )
                        .join("، ")}
                    </strong>
                    <small>{shortDate(r.created_at)}</small>
                  </span>
                  <Badge request status={r.status} />
                </Link>
              ))}
              {!requests.length && (
                <Empty
                  text="با ثبت یک نیاز شروع کنید."
                  action={
                    <ActionLink href="/app/requests/new">ثبت نیاز</ActionLink>
                  }
                />
              )}
            </div>
          ) : orders.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>شماره سفارش</th>
                    <th>تأمین‌کننده</th>
                    <th>
                      مبلغ کل <small>(تومان)</small>
                    </th>
                    <th>وضعیت</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 4).map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link
                          className="order-number"
                          href={`/app/orders/${o.id}`}
                        >
                          #{number(o.number)}
                        </Link>
                        <small className="cell-sub">
                          {shortDate(o.created_at)}
                        </small>
                      </td>
                      <td>
                        {
                          data.suppliers.find((s) => s.id === o.supplier_id)
                            ?.name
                        }
                      </td>
                      <td className="numeric">{number(o.total)}</td>
                      <td>
                        <Badge status={o.status} />
                      </td>
                      <td>
                        <Link
                          className="icon-button"
                          href={`/app/orders/${o.id}`}
                          aria-label={`جزئیات سفارش ${number(o.number)}`}
                        >
                          <ArrowUpLeft size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={
                supplier
                  ? "هنوز سفارشی دریافت نشده است"
                  : "اولین سفارش شما از همین‌جا شروع می‌شود"
              }
              text={
                supplier
                  ? "سفارش‌های جدید پس از ثبت خرید مشتری اینجا نمایش داده می‌شوند."
                  : "نیازها را ثبت و گزینه‌های تأمین را مقایسه کنید."
              }
              action={
                supplier ? undefined : (
                  <ActionLink href="/app/requests/new">ثبت نیاز</ActionLink>
                )
              }
            />
          )}
          {!employee && (
            <div className="panel-foot">
              <span>
                <Clock3 size={15} />
                وضعیت‌ها با ثبت تغییرات تأمین‌کننده به‌روز می‌شوند.
              </span>
            </div>
          )}
        </Panel>
        <Panel
          className="todo-panel"
          title="نیازمند توجه شما"
          action={
            <span className="count-pill">
              {number(supplier ? open.length : pending.length)}
            </span>
          }
        >
          {supplier ? (
            <div className="todo-list">
              {open.slice(0, 3).map((o) => (
                <Link key={o.id} href={`/app/orders/${o.id}`}>
                  <span className="task-icon">
                    <Truck size={18} />
                  </span>
                  <div>
                    <strong>سفارش #{number(o.number)}</strong>
                    <small>{money(o.total)}</small>
                  </div>
                  <ArrowLeft size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="todo-list">
              {pending.slice(0, 3).map((r) => {
                const items = data.material_request_items.filter(
                  (i) => i.request_id === r.id,
                );
                const first = data.products.find(
                  (p) => p.id === items[0]?.product_id,
                );
                return (
                  <Link href={`/app/requests/${r.id}`} key={r.id}>
                    <span
                      className={`task-icon ${r.urgency === "urgent" ? "urgent" : ""}`}
                    >
                      <ClipboardCheck size={18} />
                    </span>
                    <div>
                      <strong>
                        {first?.name}
                        {items.length > 1
                          ? " و " + number(items.length - 1) + " قلم دیگر"
                          : ""}
                      </strong>
                      <small>
                        {
                          data.profiles.find((p) => p.id === r.requested_by)
                            ?.full_name
                        }
                        {r.urgency === "urgent" ? " · فوری" : " · منتظر بررسی"}
                      </small>
                    </div>
                    <ArrowLeft size={16} />
                  </Link>
                );
              })}
              {!pending.length && (
                <div className="quiet-state">
                  <CircleCheck size={28} />
                  <p>درخواستی منتظر بررسی نیست.</p>
                </div>
              )}
            </div>
          )}
          {canBuy(role) && (
            <Link href="/app/cart" className="basket-callout">
              <span>
                <ShoppingBasket size={21} />
                <strong>سبد خرید باز شما</strong>
              </span>
              <p>قیمت و شرایط تأمین اقلام را بررسی کنید.</p>
              <b>
                ادامه خرید <ArrowLeft size={16} />
              </b>
            </Link>
          )}
        </Panel>
      </div>
      {canBuy(role) && (
        <Panel
          title="تغییرات قیمت، پیش از خرید"
          action={<TextLink href="/app/compare">بررسی قیمت‌های سبد</TextLink>}
          className="price-panel"
        >
          <div className="price-changes">
            {priceChanges.map((offer) => {
              const product = data.products.find(
                (p) => p.id === offer.product_id,
              )!;
              const diff = Math.round(
                ((offer.price - offer.previous_price!) /
                  offer.previous_price!) *
                  100,
              );
              return (
                <Link
                  href="/app/products"
                  className="price-change"
                  key={offer.id}
                >
                  <ProductIcon index={data.products.indexOf(product)} />
                  <div>
                    <strong>{product.name}</strong>
                    <small>
                      {
                        data.suppliers.find((s) => s.id === offer.supplier_id)
                          ?.name
                      }
                    </small>
                  </div>
                  <div className="price-change-number">
                    <b>{money(offer.price)}</b>
                    <small className={diff > 0 ? "increase" : "decrease"}>
                      {diff > 0 ? (
                        <ArrowUpRight size={13} />
                      ) : (
                        <ArrowDownRight size={13} />
                      )}{" "}
                      {number(Math.abs(diff))}٪ نسبت به قیمت قبلی
                    </small>
                    <small>{date(offer.updated_at, true)}</small>
                  </div>
                </Link>
              );
            })}
            {!priceChanges.length && (
              <p className="muted">هنوز تغییر قیمت ثبت‌شده‌ای وجود ندارد.</p>
            )}
          </div>
        </Panel>
      )}
    </>
  );
}
