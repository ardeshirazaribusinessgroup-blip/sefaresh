import { z } from "zod";
export const quantitySchema = z.coerce
  .number()
  .finite()
  .gt(0, "مقدار باید بیشتر از صفر باشد.")
  .max(100000, "مقدار بیش از حد مجاز است.");
export const requestSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: quantitySchema,
        note: z.string().max(500),
      }),
    )
    .min(1, "حداقل یک کالا اضافه کنید.")
    .max(50),
  urgency: z.enum(["normal", "urgent"]),
  note: z.string().max(1000),
});
export const businessSchema = z.object({
  name: z.string().trim().min(2, "نام کسب‌وکار را وارد کنید.").max(120),
  type: z.string().min(1),
  full_name: z.string().trim().min(2, "نام خود را وارد کنید.").max(100),
  phone: z
    .string()
    .regex(/^0[0-9]{10}$/, "شماره تماس را با ۱۱ رقم انگلیسی وارد کنید."),
  city: z.string().trim().min(2),
  area: z.string().trim().min(2, "محدوده فعالیت را وارد کنید.").max(120),
  address: z.string().trim().max(500),
});
export const credentialsSchema = z.object({
  email: z.email("ایمیل معتبر وارد کنید."),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.").max(128),
});
