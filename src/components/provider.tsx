"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createSeed, demoUsers } from "@/lib/seed";
import { getSupabase, isDemo } from "@/lib/supabase";
import { executeDemo, type CommandArgs } from "@/lib/demo";
import type { AppData, Business, Profile, Role } from "@/lib/types";
import { credentialsSchema } from "@/lib/validation";
import { ZodError } from "zod";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const DATA_KEY = "sefaresh-demo-v1";
const USER_KEY = "sefaresh-demo-session";
const ACCOUNTS_KEY = "sefaresh-demo-accounts";
type DemoAccount = { id: string; email: string; salt: string; hash: string };
async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function messageOf(error: unknown): string {
  if (error instanceof ZodError)
    return error.issues[0]?.message || "اطلاعات فرم را بررسی کنید.";
  const msg =
    error instanceof Error
      ? error.message
      : String((error as { message?: string })?.message || error);
  if (/[\u0600-\u06ff]/.test(msg)) return msg;
  if (/Invalid login/.test(msg)) return "ایمیل یا رمز عبور درست نیست.";
  if (/Email not confirmed/.test(msg))
    return "ابتدا پیوند تأیید ایمیل را باز کنید.";
  if (/PRICE_CHANGED|BASKET_CHANGED/.test(msg))
    return "قیمت یا سبد تغییر کرده است؛ دوباره مقایسه و بازبینی کنید.";
  if (/FORBIDDEN|permission|row.level/.test(msg))
    return "اجازه انجام این کار را ندارید.";
  if (/MINIMUM_ORDER/.test(msg))
    return "حداقل خرید تأمین‌کننده رعایت نشده است.";
  if (/OFFER_UNAVAILABLE/.test(msg))
    return "شرایط تأمین تغییر کرده است؛ گزینه دیگری انتخاب کنید.";
  if (/INVALID_TRANSITION/.test(msg)) return "این تغییر وضعیت مجاز نیست.";
  if (/already registered/.test(msg)) return "این ایمیل قبلاً ثبت شده است.";
  if (/rate limit/.test(msg))
    return "درخواست‌های زیادی ارسال شده است؛ کمی بعد دوباره تلاش کنید.";
  return "عملیات انجام نشد. اتصال و تنظیمات را بررسی کنید و دوباره تلاش کنید.";
}
type ContextValue = {
  data: AppData | null;
  userId: string | null;
  profile: Profile | undefined;
  business: Business | undefined;
  role: Role;
  loading: boolean;
  busy: boolean;
  error: string | null;
  demo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<boolean>;
  demoLogin: (role: Role) => void;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  run: (
    command: string,
    args: CommandArgs,
    success?: string,
  ) => Promise<unknown>;
  notify: (message: string, kind?: "success" | "error") => void;
};
const Context = createContext<ContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: string } | null>(
    null,
  );
  const dataRef = useRef<AppData | null>(null);
  const lock = useRef(false);
  const notify = useCallback(
    (message: string, kind: "success" | "error" = "success") =>
      setToast({ message, kind }),
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const save = useCallback((next: AppData) => {
    if (isDemo) localStorage.setItem(DATA_KEY, JSON.stringify(next));
    dataRef.current = next;
    setData(next);
  }, []);
  const loadRemote = useCallback(async () => {
    const client = getSupabase();
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError && authError.name !== "AuthSessionMissingError")
      throw authError;
    setUserId(user?.id || null);
    if (!user) {
      setData(null);
      dataRef.current = null;
      return;
    }
    const tables = Object.keys(createSeed()) as (keyof AppData)[];
    const responses = await Promise.all(
      tables.map((table) => client.from(table).select("*")),
    );
    const next = {} as AppData;
    responses.forEach((res, i) => {
      if (res.error) throw res.error;
      Object.assign(next, { [tables[i]]: res.data });
    });
    save(next);
  }, [save]);
  const reload = useCallback(async () => {
    setError(null);
    try {
      if (isDemo) {
        const raw = localStorage.getItem(DATA_KEY);
        const next = raw ? (JSON.parse(raw) as AppData) : createSeed();
        save(next);
        setUserId(localStorage.getItem(USER_KEY));
      } else await loadRemote();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [loadRemote, save]);
  useEffect(() => {
    const initialLoad = setTimeout(() => void reload(), 0);
    if (isDemo) {
      const sync = (e: StorageEvent) => {
        if (e.key === DATA_KEY || e.key === USER_KEY) void reload();
      };
      window.addEventListener("storage", sync);
      return () => {
        clearTimeout(initialLoad);
        window.removeEventListener("storage", sync);
      };
    }
    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_OUT") {
          setUserId(null);
          setData(null);
          dataRef.current = null;
        } else if (event === "SIGNED_IN") {
          setUserId(session?.user.id || null);
          setTimeout(
            () => void loadRemote().catch((e) => setError(messageOf(e))),
            0,
          );
        }
      },
    );
    return () => {
      clearTimeout(initialLoad);
      subscription.unsubscribe();
    };
  }, [reload, loadRemote]);
  const profile = data?.profiles.find((p) => p.id === userId);
  const membership = data?.business_members.find((m) => m.user_id === userId);
  const role: Role =
    profile?.role === "admin" || profile?.role === "supplier"
      ? profile.role
      : membership?.role || "employee";
  const business =
    data?.businesses.find((b) => b.id === membership?.business_id) ||
    (role === "admin" ? data?.businesses[0] : undefined);
  async function login(email: string, password: string) {
    try {
      credentialsSchema.parse({ email, password });
      if (isDemo) {
        const accounts = JSON.parse(
          localStorage.getItem(ACCOUNTS_KEY) || "[]",
        ) as DemoAccount[];
        const account = accounts.find(
          (a) => a.email === email.trim().toLowerCase(),
        );
        if (
          !account ||
          (await hashPassword(password, account.salt)) !== account.hash
        )
          throw new Error(
            "ایمیل یا رمز عبور درست نیست. برای حساب آماده از دکمه ورود نمایشی استفاده کنید.",
          );
        localStorage.setItem(USER_KEY, account.id);
        setUserId(account.id);
      } else {
        const { error } = await getSupabase().auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await loadRemote();
      }
    } catch (e) {
      throw new Error(messageOf(e));
    }
  }
  async function register(email: string, password: string) {
    try {
      credentialsSchema.parse({ email, password });
      if (isDemo) {
        const accounts = JSON.parse(
          localStorage.getItem(ACCOUNTS_KEY) || "[]",
        ) as DemoAccount[];
        if (accounts.some((a) => a.email === email.trim().toLowerCase()))
          throw new Error("این ایمیل قبلاً ثبت شده است.");
        const account = {
          id: crypto.randomUUID(),
          email: email.trim().toLowerCase(),
          salt: crypto.randomUUID(),
          hash: "",
        };
        account.hash = await hashPassword(password, account.salt);
        const next = structuredClone(dataRef.current || createSeed());
        next.profiles.push({
          id: account.id,
          full_name: "",
          phone: "",
          role: "employee",
          supplier_id: null,
        });
        save(next);
        localStorage.setItem(
          ACCOUNTS_KEY,
          JSON.stringify([...accounts, account]),
        );
        localStorage.setItem(USER_KEY, account.id);
        setUserId(account.id);
        return true;
      }
      const { data: auth, error } = await getSupabase().auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      if (auth.session) {
        await loadRemote();
        return true;
      }
      return false;
    } catch (e) {
      throw new Error(messageOf(e));
    }
  }
  function demoLogin(role: Role) {
    if (!isDemo) return;
    const account = demoUsers.find((u) => u.role === role)!;
    localStorage.setItem(USER_KEY, account.id);
    setUserId(account.id);
  }
  async function logout() {
    if (isDemo) localStorage.removeItem(USER_KEY);
    else {
      const { error } = await getSupabase().auth.signOut();
      if (error) throw new Error(messageOf(error));
    }
    setUserId(null);
  }
  async function run(command: string, args: CommandArgs, success?: string) {
    if (lock.current) throw new Error("عملیات قبلی در حال انجام است.");
    if (!userId) throw new Error("ابتدا وارد شوید.");
    lock.current = true;
    setBusy(true);
    try {
      let result: unknown;
      if (isDemo) {
        const raw = localStorage.getItem(DATA_KEY);
        const latest = raw ? (JSON.parse(raw) as AppData) : dataRef.current!;
        const updated = executeDemo(latest, userId, command, args);
        save(updated.data);
        result = updated.result;
      } else {
        const client = getSupabase();
        let response;
        if (command === "admin_save")
          response = await client
            .from(args.table!)
            .upsert(args.data as Record<string, unknown>);
        else {
          const rpcArgs: Record<string, unknown> = {};
          Object.entries(args).forEach(([key, value]) => {
            rpcArgs["p_" + key] = value;
          });
          response = await client.rpc(command, rpcArgs);
        }
        if (response.error) throw response.error;
        result = response.data;
        await loadRemote();
      }
      if (success) notify(success);
      return result;
    } catch (e) {
      const msg = messageOf(e);
      notify(msg, "error");
      throw new Error(msg);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        data,
        userId,
        profile,
        business,
        role,
        loading,
        busy,
        error,
        demo: isDemo,
        login,
        register,
        demoLogin,
        logout,
        reload,
        run,
        notify,
      }}
    >
      {children}
      {toast && (
        <div
          className={`toast ${toast.kind}`}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          <span>
            {toast.kind === "success" ? "✓" : "!"} {toast.message}
          </span>
          <button aria-label="بستن پیام" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("AppProvider missing");
  return context;
}
