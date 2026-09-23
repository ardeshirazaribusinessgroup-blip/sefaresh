"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useApp } from "./provider";
import { Button, Field, Logo, Notice } from "./ui";
import { roleLabels, type Role } from "@/lib/types";
export function AuthForm({ register = false }: { register?: boolean }) {
  const app = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [show, setShow] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (register) {
        const ready = await app.register(email, password);
        if (ready) router.push("/onboarding");
        else setSent(true);
      } else {
        await app.login(email, password);
        router.push("/app");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "اطلاعات را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Logo small />
        <h2>
          خرید روشن،
          <br />
          کنترل ساده.
        </h2>
        <p>
          یک فضای مشترک برای نیازهای تیم، مقایسه تأمین‌کنندگان و پیگیری خریدهای
          کسب‌وکارتان.
        </p>
        <span className="auth-motif">↳</span>
      </aside>
      <main className="auth-main">
        <div className="auth-form">
          <h1>{register ? "به سفارش خوش آمدید" : "دوباره خوش آمدید"}</h1>
          <p>
            {register
              ? "حساب بسازید و اولین نیاز کسب‌وکارتان را ثبت کنید."
              : "وارد شوید و خریدهای کسب‌وکارتان را ادامه دهید."}
          </p>
          {sent ? (
            <Notice kind="success">
              پیوند تأیید به ایمیل شما ارسال شد. پس از تأیید، از صفحه ورود ادامه
              دهید. <Link href="/login">ورود به حساب</Link>
            </Notice>
          ) : (
            <form className="form-stack" onSubmit={submit}>
              <Field label="ایمیل">
                <input
                  type="email"
                  dir="ltr"
                  placeholder="you@cafe.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field
                label="رمز عبور"
                hint={
                  register
                    ? "حداقل ۸ کاراکتر. در نسخه نمایشی از رمز واقعی خود استفاده نکنید."
                    : undefined
                }
              >
                <div style={{ position: "relative" }}>
                  <input
                    type={show ? "text" : "password"}
                    dir="ltr"
                    minLength={8}
                    required
                    maxLength={128}
                    value={password}
                    autoComplete={
                      register ? "new-password" : "current-password"
                    }
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: 45 }}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    style={{ position: "absolute", right: 0, top: 1 }}
                    aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              {error && (
                <p role="alert" className="error-text">
                  {error}
                </p>
              )}
              <Button type="submit" loading={busy}>
                {register ? "ساخت حساب" : "ورود به حساب"}
                <ArrowLeft size={17} />
              </Button>
            </form>
          )}
          <p className="auth-bottom">
            {register ? "قبلاً حساب ساخته‌اید؟" : "حساب ندارید؟"}{" "}
            <Link href={register ? "/login" : "/register"}>
              {register ? "وارد شوید" : "ثبت‌نام کنید"}
            </Link>
          </p>
          {app.demo && (
            <div className="demo-box">
              <Notice kind="warning">
                نسخه محلی و نمایشی است. داده‌ها فقط در همین مرورگر ذخیره می‌شوند
                و سفارشی ارسال نمی‌شود.
              </Notice>
              <p style={{ marginTop: 18 }}>
                با یک حساب آماده، مسیر خرید را امتحان کنید:
              </p>
              <div className="demo-buttons">
                {(
                  ["owner", "buyer", "employee", "supplier", "admin"] as Role[]
                ).map((role) => (
                  <Button
                    key={role}
                    variant={role === "owner" ? "primary" : "secondary"}
                    onClick={() => {
                      app.demoLogin(role);
                      router.push(role === "admin" ? "/admin" : "/app");
                    }}
                  >
                    ورود به‌عنوان {roleLabels[role]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
