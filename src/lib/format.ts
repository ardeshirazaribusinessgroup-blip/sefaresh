export const number = (value: number) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value);
export const money = (value: number) => number(value) + " تومان";
export const date = (value: string, time = false) =>
  new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    day: "numeric",
    month: "long",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
  }).format(new Date(value));
export const shortDate = (value: string) =>
  new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
export const normalize = (value: string) =>
  value
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .trim()
    .toLowerCase();
export const isThisPersianMonth = (value: string, now = new Date()) => {
  const fmt = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
  });
  return fmt.format(new Date(value)) === fmt.format(now);
};
