"use client";
import Link from "next/link";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type ReactElement,
} from "react";
import {
  ArrowLeft,
  LoaderCircle,
  PackageOpen,
  X,
  Coffee,
  Milk,
  Wine,
  Cookie,
  Package,
  Droplets,
  Leaf,
  ShoppingBag,
} from "lucide-react";
import {
  orderLabels,
  requestLabels,
  type OrderStatus,
  type RequestStatus,
} from "@/lib/types";
import { number } from "@/lib/format";
export function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" width="36" height="36" aria-hidden="true">
      <path
        d="M52 8 28 32l24 24M10 32h43M10 32l12-12M10 32l12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="52" cy="8" r="5" fill="#FFAD33" />
      <circle cx="52" cy="56" r="5" fill="#FFAD33" />
    </svg>
  );
}
export function Logo({ small = false }: { small?: boolean }) {
  return (
    <Link className={`logo ${small ? "small" : ""}`} href="/">
      <span className="logo-mark">
        <BrandMark />
      </span>
      <span>سفارش{!small && <small>خرید روشن، کنترل ساده</small>}</span>
    </Link>
  );
}
export function Button({
  children,
  className = "",
  variant = "primary",
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`btn ${variant} ${className}`}
    >
      {loading ? <LoaderCircle className="spin" size={18} /> : null}
      {children}
    </button>
  );
}
export function ActionLink({
  href,
  children,
  secondary = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <Link
      className={`btn ${secondary ? "secondary" : "primary"} ${className}`}
      href={href}
    >
      {children}
    </Link>
  );
}
export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Badge({
  status,
  request = false,
}: {
  status: OrderStatus | RequestStatus;
  request?: boolean;
}) {
  const label = request
    ? requestLabels[status as RequestStatus]
    : orderLabels[status as OrderStatus];
  return (
    <span className={`badge ${status}`}>
      <i />
      {label}
    </span>
  );
}
export function Empty({
  title = "هنوز موردی ثبت نشده است",
  text,
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <PackageOpen size={32} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" />
      <span>در حال دریافت اطلاعات…</span>
    </div>
  );
}
export function Panel({
  children,
  className = "",
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowLeft size={15} />
    </Link>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const fieldId = useId();
  const labelId = `${fieldId}-label`;
  const hintId = `${fieldId}-hint`;
  function connectControls(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (node) => {
      if (!isValidElement(node)) return node;
      const element = node as ReactElement<
        Record<string, unknown> & { children?: ReactNode }
      >;
      if (
        typeof element.type === "string" &&
        ["input", "select", "textarea"].includes(element.type)
      ) {
        return cloneElement(element, {
          id: element.props.id || fieldId,
          ...(!element.props["aria-label"]
            ? { "aria-labelledby": labelId }
            : {}),
          ...(hint ? { "aria-describedby": hintId } : {}),
        });
      }
      return element.props.children
        ? cloneElement(element, {}, connectControls(element.props.children))
        : element;
    });
  }
  return (
    <div className="field">
      <label htmlFor={fieldId} id={labelId}>
        {label}
      </label>
      {connectControls(children)}
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}
export function Notice({
  children,
  kind = "info",
}: {
  children: ReactNode;
  kind?: "info" | "warning" | "error" | "success";
}) {
  return <div className={`notice ${kind}`}>{children}</div>;
}
export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (open && !el?.open) el?.showModal();
    if (!open && el?.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="modal"
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="بستن پنجره"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {open && children}
    </dialog>
  );
}
export function ProductIcon({
  index = 0,
  large = false,
}: {
  index?: number;
  large?: boolean;
}) {
  const icons = [
    Coffee,
    Milk,
    Wine,
    Cookie,
    Milk,
    ShoppingBag,
    Cookie,
    Coffee,
    Leaf,
    Droplets,
    Package,
    Package,
  ];
  const Icon = icons[index % icons.length];
  return (
    <span className={`product-icon color-${index % 6} ${large ? "large" : ""}`}>
      <Icon size={large ? 36 : 22} strokeWidth={1.7} />
    </span>
  );
}
export function Stepper({ step }: { step: number }) {
  return (
    <div className="stepper">
      {["ساخت سبد خرید", "مقایسه تأمین‌کنندگان", "بازبینی و ثبت سفارش"].map(
        (label, i) => (
          <div
            className={i === step ? "active" : i < step ? "done" : ""}
            key={label}
          >
            <span>{i < step ? "✓" : number(i + 1)}</span>
            {label}
          </div>
        ),
      )}
    </div>
  );
}
