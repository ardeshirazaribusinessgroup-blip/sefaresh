import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function demoLogin(page: Page, role = "مالک کسب‌وکار") {
  await page.goto("/login");
  await page
    .getByRole("button", { name: `ورود به‌عنوان ${role}`, exact: true })
    .click();
  await expect(page.locator("h1")).toBeVisible();
  await expect(page).toHaveURL(role === "مدیر سامانه" ? /\/admin$/ : /\/app$/);
}
async function screen(page: Page, name: string, project: string) {
  await expect(page.locator(".loading-state")).toHaveCount(0);
  await expect(page.locator("h1")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const sizes = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: innerWidth,
  }));
  expect(sizes.scroll, `horizontal overflow at ${name}`).toBeLessThanOrEqual(
    sizes.width + 1,
  );
  mkdirSync("tmp/qa", { recursive: true });
  await page.screenshot({
    path: `tmp/qa/${project}-${name}.png`,
    fullPage: !(await page.getByRole("dialog").isVisible()),
  });
}
test("new cafe: register, onboard, create/edit multiple items, optimize, split checkout, history and login persistence", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `cafe-${testInfo.project.name}-${Date.now()}@example.test`,
    password = "DemoCafe2026!";
  await page.goto("/register");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ساخت حساب", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page
    .getByLabel("نام کسب‌وکار", { exact: true })
    .fill("کافه آزمون مسیر کامل");
  await page
    .getByLabel("نام و نام خانوادگی", { exact: true })
    .fill("سارا آزمون");
  await page.getByLabel("شماره تماس", { exact: true }).fill("09123456789");
  await page.getByLabel("محدوده فعالیت", { exact: true }).fill("جمهوری");
  await page
    .getByLabel("نشانی تحویل", { exact: true })
    .fill("کرمان، بلوار جمهوری، کافه آزمون");
  await screen(page, "onboarding", testInfo.project.name);
  await page.getByRole("button", { name: "ثبت کسب‌وکار و اولین نیاز" }).click();
  await expect(page).toHaveURL(/\/app\/requests\/new$/);
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "نمای کلی کسب‌وکار", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "ثبت درخواست جدید", exact: true })
    .click();
  await page.getByLabel("کالای ۱", { exact: true }).selectOption(uid(100));
  await page.getByLabel("مقدار ۱", { exact: true }).fill("2");
  await page.getByRole("button", { name: "افزودن کالای دیگر" }).click();
  await page.getByLabel("کالای ۲", { exact: true }).selectOption(uid(101));
  await page.getByLabel("مقدار ۲", { exact: true }).fill("12");
  await page.getByRole("button", { name: "افزودن کالای دیگر" }).click();
  await page.getByLabel("کالای ۳", { exact: true }).selectOption(uid(102));
  await page.getByLabel("مقدار ۳", { exact: true }).fill("2");
  await screen(page, "new-request", testInfo.project.name);
  await page
    .getByRole("button", { name: "ثبت ۳ قلم درخواست", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "جزئیات درخواست" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "ویرایش درخواست", exact: true }).click();
  await page.getByLabel("مقدار ۱", { exact: true }).fill("3");
  await page
    .getByRole("button", { name: "ثبت ۳ قلم درخواست", exact: true })
    .click();
  await expect(page.getByText("۳ کیلوگرم", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "تأیید درخواست", exact: true })
    .click();
  await page
    .getByRole("button", { name: "افزودن به سبد خرید", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/cart$/);
  await screen(page, "cart", testInfo.project.name);
  await page
    .getByRole("link", { name: "مقایسه تأمین‌کنندگان", exact: true })
    .last()
    .click();
  await expect(page.locator(".quote-card")).toHaveCount(4);
  await screen(page, "compare", testInfo.project.name);
  await page.getByRole("button", { name: "پیشنهاد سبد با این معیار" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ثبت نهایی سفارش" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "بستن پنجره", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "انتخاب تأمین‌کننده برای هر قلم" })
    .click();
  const pickers = page.locator(".panel select");
  await expect(pickers).toHaveCount(3);
  await pickers.nth(0).selectOption(uid(320)); // Coffee: Pars.
  await pickers.nth(1).selectOption(uid(301)); // Milk: Aftab.
  await pickers.nth(2).selectOption(uid(302)); // Syrup: Aftab, which also meets MOQ.
  await page.getByRole("button", { name: "محاسبه و بازبینی خرید" }).click();
  await expect(
    page.getByText("مبلغ نهایی ۲ سفارش", { exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await screen(page, "confirmation", testInfo.project.name);
  await page
    .getByRole("button", { name: "ثبت نهایی سفارش", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app\/orders$/);
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("link", { name: "جزئیات", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "مسیر سفارش" })).toBeVisible();
  await screen(page, "order", testInfo.project.name);
  await page.reload();
  await expect(page.getByRole("heading", { name: "مسیر سفارش" })).toBeVisible();
  await page.goto("/app/history");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("textbox", { name: "جست‌وجوی سفارش" }).fill("دانه");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto("/app");
  await screen(page, "new-cafe-dashboard", testInfo.project.name);
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "باز کردن فهرست" }).click();
  await page.getByRole("button", { name: "خروج از حساب", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("ایمیل", { exact: true }).fill(email);
  await page.getByLabel("رمز عبور", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/history");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  expect(errors).toEqual([]);
});
test("demo roles, admin operations, order timeline and missing offers", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await demoLogin(page);
  await screen(page, "dashboard", testInfo.project.name);
  await page.goto("/app/compare");
  await page
    .getByRole("button", { name: "تحویل سریع‌تر", exact: true })
    .click();
  await expect(page.locator(".quote-card.recommended h3")).toHaveText(
    "کافه‌کالا",
  );
  await demoLogin(page, "کارمند");
  await page.goto("/app/orders");
  await expect(
    page.getByText("این بخش برای نقش شما در دسترس نیست"),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "دسترسی به این بخش مجاز نیست" }),
  ).toBeVisible();
  await demoLogin(page, "مدیر سامانه");
  await page.goto("/admin/customers");
  await page
    .getByRole("button", { name: /ویرایش کافه/ })
    .first()
    .click();
  await page
    .getByLabel("محدوده فعالیت", { exact: true })
    .fill("جمهوری، محدوده آزمایشی");
  await page.getByLabel("شماره تماس", { exact: true }).fill("09123456789");
  await page
    .getByRole("button", { name: "ذخیره تغییرات", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByText("جمهوری، محدوده آزمایشی", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/products");
  await page.getByRole("button", { name: "کالای جدید", exact: true }).click();
  await page.getByLabel("نام کالا", { exact: true }).fill("کالای بدون پیشنهاد");
  await page
    .getByRole("button", { name: "ذخیره اطلاعات", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("کالای بدون پیشنهاد", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/offers");
  await page
    .getByRole("button", { name: /ویرایش دانه قهوه/ })
    .first()
    .click();
  await page.getByLabel("قیمت هر بسته (تومان)", { exact: true }).fill("795000");
  await page
    .getByRole("button", { name: "ذخیره اطلاعات", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/admin/orders");
  await page.getByRole("link", { name: "جزئیات", exact: true }).first().click();
  await page.getByLabel("وضعیت جدید", { exact: true }).selectOption("shipped");
  await page
    .getByLabel("توضیح تغییر (برای لغو الزامی است)", { exact: true })
    .fill("خروج از انبار برای آزمون");
  await page
    .getByRole("button", { name: "ثبت وضعیت جدید", exact: true })
    .click();
  await expect(page.locator(".timeline-event.current h3")).toHaveText(
    "ارسال شد",
  );
  await page.reload();
  await expect(
    page.getByText("خروج از انبار برای آزمون", { exact: true }),
  ).toBeVisible();
  await demoLogin(page);
  await page.goto("/app/products");
  await page.getByLabel("جست‌وجو در فهرست کالاها").fill("بدون پیشنهاد");
  await page
    .getByRole("button", { name: "افزودن به سبد خرید", exact: true })
    .click();
  await page
    .getByRole("button", { name: "افزودن به سبد", exact: true })
    .click();
  await page.goto("/app/compare");
  await expect(
    page.getByText(/این اقلام پیشنهاد قابل سفارش ندارند/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "پیشنهاد سبد با این معیار" }),
  ).toBeDisabled();
  await screen(page, "unavailable", testInfo.project.name);
  await page.getByRole("link", { name: "ویرایش سبد", exact: true }).click();
  await page
    .getByRole("button", { name: "حذف کالای بدون پیشنهاد", exact: true })
    .click();
  await page.goto("/app/compare");
  await expect(
    page.getByRole("button", { name: "پیشنهاد سبد با این معیار" }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});
test("all route surfaces, empty searches and mobile layout", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await demoLogin(page);
  for (const route of [
    "/app/requests",
    "/app/products",
    "/app/suppliers",
    "/app/profile",
    "/app/history",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    await screen(page, route.split("/").pop()!, testInfo.project.name);
  }
  await page.goto("/app/products");
  await page.getByLabel("جست‌وجو در فهرست کالاها").fill("وجودندارد");
  await expect(
    page.getByRole("heading", { name: "کالایی پیدا نشد" }),
  ).toBeVisible();
  await page.goto("/app/requests/00000000-0000-4000-8000-999999999999");
  await expect(
    page.getByRole("heading", {
      name: "درخواست پیدا نشد یا به آن دسترسی ندارید",
    }),
  ).toBeVisible();
  await page.goto("/missing-page");
  await expect(
    page.getByRole("heading", { name: "این صفحه پیدا نشد" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
