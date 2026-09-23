"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="standalone">
      <h1>صفحه بارگذاری نشد</h1>
      <p>اتصال را بررسی کنید و دوباره تلاش کنید.</p>
      <button className="btn primary" onClick={reset}>
        تلاش دوباره
      </button>
    </main>
  );
}
