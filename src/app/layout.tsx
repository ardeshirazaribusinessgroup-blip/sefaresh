import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import "./brand.css";
import { AppProvider } from "@/components/provider";
export const metadata: Metadata = {
  title: { default: "سفارش | خرید مواد اولیه آسان شد", template: "%s | سفارش" },
  description:
    "دستیار خرید مواد اولیه کافه‌ها و رستوران‌ها؛ از ثبت نیاز تا مقایسه تأمین‌کنندگان و پیگیری سفارش.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
