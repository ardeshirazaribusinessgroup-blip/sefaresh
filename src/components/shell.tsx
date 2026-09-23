"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  ShoppingBasket,
  ArrowLeftRight,
  Truck,
  History,
  Store,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  MapPin,
  CircleHelp,
  ShieldCheck,
  Users,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "./provider";
import { Button, Loading, Logo, Modal, Notice } from "./ui";
import { roleLabels } from "@/lib/types";
import { number } from "@/lib/format";
const appNav = [
  ["/app", "نمای کلی", LayoutDashboard],
  ["/app/requests", "درخواست‌های مواد اولیه", ClipboardList],
  ["/app/products", "فهرست کالاها", Package],
  ["/app/cart", "سبد خرید", ShoppingBasket],
  ["/app/compare", "مقایسه تأمین‌کنندگان", ArrowLeftRight],
  ["/app/orders", "سفارش‌ها", Truck],
  ["/app/history", "سابقه خرید", History],
  ["/app/suppliers", "تأمین‌کنندگان", Store],
] as const;
const adminNav = [
  ["/admin", "نمای کلی مدیریت", LayoutDashboard],
  ["/admin/products", "کالاها و دسته‌بندی‌ها", Package],
  ["/admin/suppliers", "تأمین‌کنندگان", Store],
  ["/admin/offers", "قیمت و موجودی", ArrowLeftRight],
  ["/admin/requests", "درخواست‌ها", ClipboardList],
  ["/admin/orders", "سفارش‌ها", Truck],
  ["/admin/customers", "کسب‌وکارها و کاربران", Users],
] as const;
export function Shell({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const app = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [help, setHelp] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!app.loading && !app.userId) router.replace("/login");
    else if (
      !app.loading &&
      app.profile &&
      !app.business &&
      !["admin", "supplier"].includes(app.role)
    )
      router.replace("/onboarding");
  }, [app.loading, app.userId, app.business, app.role, app.profile, router]);
  if (app.loading) return <Loading />;
  if (app.error)
    return (
      <div className="standalone">
        <Notice kind="error">{app.error}</Notice>
        <Button onClick={() => void app.reload()}>تلاش دوباره</Button>
      </div>
    );
  if (!app.userId || !app.data) return <Loading />;
  if (admin && app.role !== "admin")
    return (
      <div className="standalone">
        <ShieldCheck />
        <h1>دسترسی به این بخش مجاز نیست</h1>
        <Link href="/app">بازگشت به نمای کلی</Link>
      </div>
    );
  const pending = app.data.material_requests.filter(
    (r) =>
      r.business_id === app.business?.id &&
      ["submitted", "reviewing"].includes(r.status),
  ).length;
  const basket = app.data.procurement_baskets.find(
    (b) => b.business_id === app.business?.id,
  );
  const basketCount = app.data.basket_items.filter(
    (i) => i.basket_id === basket?.id,
  ).length;
  const links = admin
    ? adminNav
    : app.role === "employee"
      ? appNav.filter(([href]) =>
          ["/app", "/app/requests", "/app/products"].includes(href),
        )
      : app.role === "supplier"
        ? appNav.filter(([href]) => ["/app", "/app/orders"].includes(href))
        : appNav;
  const current = links.find(([href]) =>
    href === "/app" || href === "/admin"
      ? pathname === href
      : pathname.startsWith(href),
  );
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="بستن فهرست"
          onClick={() => setMobile(false)}
        />
      )}
      <aside id="workspace-menu" className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="sidebar-logo">
          <Logo />
          <button
            className="icon-button mobile-only"
            onClick={() => setMobile(false)}
            aria-label="بستن فهرست"
          >
            <X />
          </button>
        </div>
        <Link href="/app/profile" className="business-switch">
          <span className="business-icon">
            <CoffeeIcon />
          </span>
          <span>
            <strong>
              {app.business?.name ||
                (app.role === "supplier" ? "پنل تأمین‌کننده" : "مدیریت سفارش")}
            </strong>
            <small>
              <MapPin size={12} />
              {app.business?.city || "کرمان"} · {roleLabels[app.role]}
            </small>
          </span>
          <ChevronDown size={16} />
        </Link>
        <small className="nav-caption">
          {admin ? "مدیریت عملیات" : "فضای کار شما"}
        </small>
        <nav className="side-nav">
          {links.map(([href, label, Icon]) => {
            const active =
              href === "/app" || href === "/admin"
                ? pathname === href
                : pathname.startsWith(href);
            const count =
              href === "/app/requests"
                ? pending
                : href === "/app/cart"
                  ? basketCount
                  : 0;
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
                onClick={() => setMobile(false)}
              >
                <Icon size={20} />
                <span>{label}</span>
                {count > 0 && <b>{number(count)}</b>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {app.role === "admin" && (
            <Link className="admin-switch" href={admin ? "/app" : "/admin"}>
              <ShieldCheck size={18} />
              {admin ? "مشاهده فضای کسب‌وکار" : "مدیریت سامانه"}
              <ArrowLeft size={15} />
            </Link>
          )}
          <button className="help-card" onClick={() => setHelp(true)}>
            <span>
              <CircleHelp size={22} />
              <strong>در خرید کنارتان هستیم</strong>
            </span>
            <small>راهنمای شروع و مراحل خرید</small>
            <ArrowLeft size={16} />
          </button>
          <Link className="settings-link" href="/app/profile">
            <Settings size={19} />
            تنظیمات کسب‌وکار
          </Link>
          <button
            className="logout"
            onClick={() =>
              void app
                .logout()
                .then(() => router.push("/login"))
                .catch((e) => app.notify(e.message, "error"))
            }
          >
            <LogOut size={18} />
            خروج از حساب
          </button>
          <div className="sidebar-foot">
            سفارش <span>نسخه آزمایشی ۰.۱</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-only"
              onClick={() => setMobile(true)}
              aria-label="باز کردن فهرست"
              aria-controls="workspace-menu"
              aria-expanded={mobile}
            >
              <Menu />
            </button>
            <span>فضای کار</span>
            <span>/</span>
            <strong>{current?.[1] || "جزئیات"}</strong>
          </div>
          <div className="topbar-actions">
            <form
              className="header-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/app/products?q=${encodeURIComponent(search)}`);
              }}
            >
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="جست‌وجوی کالا"
                placeholder="جست‌وجو در کالاها…"
              />
              <kbd>↵</kbd>
            </form>
            <Link
              href={app.role === "supplier" ? "/app/orders" : "/app/requests"}
              className="icon-button notification"
              aria-label="درخواست‌های منتظر بررسی"
            >
              <Bell size={20} />
              {pending > 0 && <i />}
            </Link>
            <span className="topbar-divider" />
            <Link
              className="user-avatar"
              href="/app/profile"
              aria-label="پروفایل"
            >
              {app.profile?.full_name?.charAt(0) || "س"}
            </Link>
          </div>
        </header>
        <main className="main-content">
          {app.demo && (
            <div className="demo-strip">
              <span>
                <i />
                نسخه نمایشی · اطلاعات و قیمت‌ها فرضی‌اند
              </span>
              <Link href="/login">
                تغییر نقش کاربر <ArrowLeft size={13} />
              </Link>
            </div>
          )}
          {children}
          <footer className="workspace-footer">
            <span>سفارش؛ دستیار خرید مواد اولیه</span>
            <span>از نیاز تا خرید، یک مسیر روشن.</span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        {links.slice(0, 4).map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : ""}
          >
            <Icon size={21} />
            <span>{href === "/app/requests" ? "درخواست‌ها" : label}</span>
          </Link>
        ))}
      </nav>
      <Modal
        open={help}
        title="از اعلام نیاز تا تحویل"
        onClose={() => setHelp(false)}
      >
        <div className="help-steps">
          {[
            "نیازهای تیم را همراه مقدار و واحد ثبت کنید.",
            "مدیر یا مسئول خرید درخواست را بررسی و به سبد اضافه می‌کند.",
            "قیمت، ارسال، حداقل خرید و زمان تحویل را مقایسه کنید.",
            "پس از بازبینی، سفارش را ثبت و وضعیت آن را پیگیری کنید.",
          ].map((text, i) => (
            <p key={text}>
              <b>{number(i + 1)}</b>
              {text}
            </p>
          ))}
        </div>
        <Notice>
          ثبت سفارش به معنی تأیید موجودی نیست. وضعیت «تأیید تأمین‌کننده» را در
          مسیر سفارش بررسی کنید.
        </Notice>
      </Modal>
    </div>
  );
}
function CoffeeIcon() {
  return <Store size={20} />;
}
