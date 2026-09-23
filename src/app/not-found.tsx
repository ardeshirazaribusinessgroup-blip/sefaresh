import { ActionLink } from "@/components/ui";
export default function NotFound() {
  return (
    <main className="standalone">
      <h1>این صفحه پیدا نشد</h1>
      <p>ممکن است نشانی تغییر کرده باشد.</p>
      <ActionLink href="/app">بازگشت به نمای کلی</ActionLink>
    </main>
  );
}
