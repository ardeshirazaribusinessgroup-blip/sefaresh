"use client";
import { Suspense } from "react";
import { useApp } from "./provider";
import { Shell } from "./shell";
import { Dashboard } from "./dashboard";
import { Requests, NewRequest, RequestDetail } from "./requests";
import { Catalog, Suppliers } from "./catalog";
import { Cart } from "./cart";
import { Compare } from "./compare";
import { Orders, OrderDetail } from "./orders";
import { ProfilePage } from "./profile";
import { AdminCatalog, AdminDashboard, Customers } from "./admin";
import { ActionLink, Empty, Loading } from "./ui";
export function Workspace({
  path = [],
  admin = false,
}: {
  path?: string[];
  admin?: boolean;
}) {
  return (
    <Shell admin={admin}>
      <Suspense fallback={<Loading />}>
        <Content path={path} admin={admin} />
      </Suspense>
    </Shell>
  );
}
function Content({ path, admin }: { path: string[]; admin: boolean }) {
  const app = useApp();
  const page = path[0] || "";
  const id = path[1];
  if (app.loading || !app.data || !app.userId) return <Loading />;
  if (
    !admin &&
    ((app.role === "employee" &&
      !["", "requests", "products", "profile"].includes(page)) ||
      (app.role === "supplier" && !["", "orders", "profile"].includes(page)))
  )
    return (
      <Empty
        title="این بخش برای نقش شما در دسترس نیست"
        action={<ActionLink href="/app">بازگشت به نمای کلی</ActionLink>}
      />
    );
  if (admin && app.role !== "admin") return null;
  if (path.length === 3 && page === "requests" && path[2] === "edit")
    return <NewRequest editId={id} key={id} />;
  if (path.length > 2) return <Empty title="صفحه پیدا نشد" />;
  if (page === "") return admin ? <AdminDashboard /> : <Dashboard />;
  if (page === "requests")
    return id === "new" ? (
      <NewRequest />
    ) : id ? (
      <RequestDetail id={id} />
    ) : (
      <Requests admin={admin} />
    );
  if (page === "products")
    return admin ? <AdminCatalog kind="products" /> : <Catalog />;
  if (page === "suppliers")
    return admin ? <AdminCatalog kind="suppliers" /> : <Suppliers />;
  if (page === "offers" && admin) return <AdminCatalog kind="offers" />;
  if (page === "customers" && admin) return <Customers />;
  if (page === "orders")
    return id ? <OrderDetail id={id} /> : <Orders admin={admin} />;
  if (page === "history" && !admin) return <Orders history />;
  if (page === "cart" && !admin) return <Cart />;
  if (page === "compare" && !admin) return <Compare />;
  if (page === "profile" && !admin) return <ProfilePage />;
  return (
    <Empty
      title="صفحه پیدا نشد"
      action={<ActionLink href="/app">بازگشت به نمای کلی</ActionLink>}
    />
  );
}
