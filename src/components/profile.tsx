"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";
import { useApp } from "./provider";
import { Button, Field, Loading, Logo, Notice, PageTitle, Panel } from "./ui";
import { roleLabels, type Business, type BusinessDraft } from "@/lib/types";
import { canManageTeam } from "@/lib/domain";
export function BusinessForm({
  onboarding = false,
  targetBusiness,
  onSaved,
}: {
  onboarding?: boolean;
  targetBusiness?: Business;
  onSaved?: () => void;
}) {
  const app = useApp();
  const router = useRouter();
  const business = targetBusiness || app.business;
  const [draft, setDraft] = useState<BusinessDraft>(() => ({
    name: business?.name || "",
    type: business?.type || "کافه",
    full_name: app.profile?.full_name || "",
    phone: business?.phone || app.profile?.phone || "",
    city: business?.city || "کرمان",
    area: business?.area || "",
    address: business?.address || "",
  }));
  const [error, setError] = useState("");
  const [job, setJob] = useState("مالک");
  function field(key: keyof BusinessDraft, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await app.run(
        onboarding ? "onboard_business" : "update_business",
        onboarding
          ? { data: draft }
          : { business_id: business!.id, data: draft },
        onboarding
          ? "کسب‌وکار شما ثبت شد. اولین نیاز را بنویسید."
          : "اطلاعات ذخیره شد.",
      );
      if (onboarding) router.push("/app/requests/new");
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const editable =
    onboarding || ["owner", "manager", "admin"].includes(app.role);
  return (
    <form onSubmit={submit} className="form-stack">
      <div className="form-grid">
        <Field label="نام کسب‌وکار">
          <input
            required
            disabled={!editable}
            value={draft.name}
            onChange={(e) => field("name", e.target.value)}
            placeholder="مثلاً کافه چنار"
            maxLength={120}
          />
        </Field>
        <Field label="نوع کسب‌وکار">
          <select
            value={draft.type}
            disabled={!editable}
            onChange={(e) => field("type", e.target.value)}
          >
            {[
              "کافه",
              "رستوران",
              "فست‌فود",
              "آبمیوه و بستنی",
              "قنادی",
              "سایر",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        {!targetBusiness && (
          <Field label="نام و نام خانوادگی">
            <input
              required
              disabled={!editable}
              value={draft.full_name}
              onChange={(e) => field("full_name", e.target.value)}
              maxLength={100}
            />
          </Field>
        )}
        <Field label="شماره تماس">
          <input
            required
            disabled={!editable}
            dir="ltr"
            inputMode="tel"
            pattern="0[0-9]{10}"
            placeholder="09123456789"
            value={draft.phone}
            onChange={(e) => field("phone", e.target.value)}
          />
        </Field>
        <Field label="شهر">
          <input
            required
            disabled={!editable}
            value={draft.city}
            onChange={(e) => field("city", e.target.value)}
          />
        </Field>
        <Field label="محدوده فعالیت">
          <input
            required
            disabled={!editable}
            value={draft.area}
            onChange={(e) => field("area", e.target.value)}
            placeholder="مثلاً بلوار جمهوری"
          />
        </Field>
        {onboarding && (
          <Field
            label="نقش کاری شما"
            hint="سازنده کسب‌وکار، دسترسی مالک دریافت می‌کند؛ نقش اعضای تیم پس از ثبت قابل تعیین است."
          >
            <select value={job} onChange={(e) => setJob(e.target.value)}>
              {["مالک", "مدیر", "مسئول خرید", "کارمند"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="span-2">
          <Field
            label="نشانی تحویل"
            hint="می‌توانید نشانی دقیق را هنگام ثبت سفارش تکمیل کنید."
          >
            <textarea
              disabled={!editable}
              value={draft.address}
              onChange={(e) => field("address", e.target.value)}
              maxLength={500}
            />
          </Field>
        </div>
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {editable ? (
        <Button type="submit" loading={app.busy}>
          {onboarding ? "ثبت کسب‌وکار و اولین نیاز" : "ذخیره تغییرات"}
          <ArrowLeft size={17} />
        </Button>
      ) : (
        <Notice>ویرایش اطلاعات کسب‌وکار در دسترس مالک و مدیر است.</Notice>
      )}
    </form>
  );
}
export function Onboarding() {
  const app = useApp();
  const router = useRouter();
  useEffect(() => {
    if (!app.loading) {
      if (!app.userId) router.replace("/login");
      else if (app.business) router.replace("/app/requests/new");
    }
  }, [app.loading, app.userId, app.business, router]);
  if (app.error)
    return (
      <main className="standalone">
        <Notice kind="error">{app.error}</Notice>
        <Button onClick={() => void app.reload()}>تلاش دوباره</Button>
      </main>
    );
  if (app.loading || !app.userId || !app.data) return <Loading />;
  return (
    <main className="onboarding-page">
      <Logo />
      <PageTitle
        title="کمی از کسب‌وکارتان بگویید"
        subtitle="یک بار ثبت کنید، بعد مستقیم سراغ اولین نیاز بروید."
      />
      <Panel>
        <BusinessForm onboarding />
      </Panel>
      {app.demo && (
        <Notice kind="warning">
          این کسب‌وکار فقط در نسخه نمایشی همین مرورگر ذخیره می‌شود.
        </Notice>
      )}
    </main>
  );
}
export function ProfilePage() {
  const app = useApp();
  if (!app.data) return null;
  const members = app.data.business_members.filter(
    (m) => m.business_id === app.business?.id,
  );
  return (
    <>
      <PageTitle
        title="تنظیمات کسب‌وکار"
        subtitle="اطلاعات تماس، تحویل و دسترسی اعضای تیم"
      />
      {app.business ? (
        <Panel title="اطلاعات کسب‌وکار">
          <div className="panel-body">
            <BusinessForm key={app.business.id} />
          </div>
        </Panel>
      ) : (
        <Panel>
          <div className="panel-body">
            <Store />
            <h2>{app.profile?.full_name}</h2>
            <p>{roleLabels[app.role]}</p>
          </div>
        </Panel>
      )}
      {!!members.length && (
        <Panel title="اعضای تیم" className="section-space">
          <div className="panel-body">
            {members.map((m) => {
              const p = app.data!.profiles.find((p) => p.id === m.user_id);
              return (
                <div className="member-row" key={m.id}>
                  <span className="user-avatar">{p?.full_name.charAt(0)}</span>
                  <div>
                    <strong>{p?.full_name}</strong>
                    <small>{roleLabels[m.role]}</small>
                  </div>
                  {canManageTeam(app.role) && m.role !== "owner" && (
                    <select
                      aria-label={`نقش ${p?.full_name}`}
                      value={m.role}
                      onChange={(e) =>
                        void app
                          .run(
                            "manage_member",
                            {
                              business_id: m.business_id,
                              user_id: m.user_id,
                              role: e.target.value,
                            },
                            "نقش عضو به‌روز شد.",
                          )
                          .catch(() => {})
                      }
                    >
                      <option value="manager">مدیر</option>
                      <option value="buyer">مسئول خرید</option>
                      <option value="employee">کارمند</option>
                    </select>
                  )}
                </div>
              );
            })}
            <Notice>
              افزودن عضو تازه در پایلوت توسط مدیر سامانه انجام می‌شود. کاربر
              باید ابتدا حساب بسازد.
            </Notice>
          </div>
        </Panel>
      )}
      <Panel className="section-space" title="حساب شما">
        <div className="panel-body">
          <p>شناسه کاربر برای افزودن به تیم:</p>
          <code
            dir="ltr"
            style={{
              display: "block",
              overflowWrap: "anywhere",
              fontSize: 12,
              marginTop: 8,
            }}
          >
            {app.userId}
          </code>
        </div>
      </Panel>
    </>
  );
}
