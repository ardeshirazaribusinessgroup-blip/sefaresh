import { createBrowserClient } from "@supabase/ssr";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isDemo = !url || !key;
let client: ReturnType<typeof createBrowserClient> | null = null;
export const getSupabase = () => {
  if (!url || !key) throw new Error("Supabase is not configured.");
  return (client ??= createBrowserClient(url, key));
};
