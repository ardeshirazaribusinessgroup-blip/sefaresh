import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

test("public pages, supplier administration, categories and product archive", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  mkdirSync("tmp/qa", { recursive: true });
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("خرید مواد اولیه");
  await expect(
    page
      .getByRole("list", { name: "مسیر خرید با سفارش" })
      .getByRole("listitem"),
  ).toHaveCount(3);
  await expect(
    page.getByRole("img", { name: "روشا، همراه راهنمای خرید سفارش" }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `tmp/qa/${testInfo.project.name}-landing.png`,
    fullPage: true,
  });
  if (testInfo.project.name === "mobile") {
    const originalViewport = page.viewportSize()!;
    await page.setViewportSize({ width: 320, height: 700 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "tmp/qa/mobile-landing-320.png",
      fullPage: true,
    });
    await page.setViewportSize(originalViewport);
  }
  await expect(
    page.getByRole("link", { name: "ببینید چطور کار می‌کند" }),
  ).toHaveAttribute("href", "#how");
  await page
    .getByRole("link", { name: "ساخت حساب کسب‌وکار", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/register$/);
  await page.goto("/login");
  await page.screenshot({
    path: `tmp/qa/${testInfo.project.name}-login.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "ورود به‌عنوان مدیر سامانه", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/suppliers");
  await page
    .getByRole("button", { name: "تأمین‌کننده جدید", exact: true })
    .click();
  await page
    .getByLabel("نام تأمین‌کننده", { exact: true })
    .fill("تأمین آزمایشی کرمان");
  await page.getByLabel("حداقل خرید (تومان)", { exact: true }).fill("500000");
  await page
    .getByRole("button", { name: "ذخیره اطلاعات", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "ویرایش تأمین آزمایشی کرمان", exact: true })
    .click();
  await page
    .getByLabel("هزینه پایه ارسال (تومان)", { exact: true })
    .fill("40000");
  await page
    .getByRole("button", { name: "ذخیره اطلاعات", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "ویرایش تأمین آزمایشی کرمان", exact: true })
    .click();
  await expect(
    page.getByLabel("هزینه پایه ارسال (تومان)", { exact: true }),
  ).toHaveValue("40000");
  await page.getByRole("button", { name: "بستن پنجره", exact: true }).click();
  await page.goto("/admin/products");
  await page
    .getByRole("button", { name: "دسته‌بندی جدید", exact: true })
    .click();
  await page.getByLabel("نام دسته‌بندی", { exact: true }).fill("دسته آزمایشی");
  await page
    .getByRole("button", { name: "ذخیره دسته‌بندی", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "کالای جدید", exact: true }).click();
  await page
    .getByLabel("نام کالا", { exact: true })
    .fill("کالای بایگانی‌شده آزمون");
  await page
    .getByLabel("دسته‌بندی", { exact: true })
    .selectOption({ label: "دسته آزمایشی" });
  await page
    .getByRole("button", { name: "ذخیره اطلاعات", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", {
      name: "ویرایش کالای بایگانی‌شده آزمون",
      exact: true,
    })
    .click();
  await page.getByLabel("کالا فعال است", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "ذخیره اطلاعات", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/login");
  await page
    .getByRole("button", { name: "ورود به‌عنوان مالک کسب‌وکار", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/products");
  await page
    .getByLabel("جست‌وجو در فهرست کالاها")
    .fill("کالای بایگانی‌شده آزمون");
  await expect(
    page.getByRole("heading", { name: "کالایی پیدا نشد" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
