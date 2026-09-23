import type {
  AppData,
  BusinessDraft,
  RequestDraft,
  RequestStatus,
  OrderStatus,
  Selection,
  AdminTable,
} from "./types";
import { canBuy, canMoveOrder, selectedQuotes } from "./domain";
import { businessSchema, quantitySchema, requestSchema } from "./validation";
export interface CommandArgs {
  business_id?: string;
  id?: string;
  status?: string;
  data?: unknown;
  action?: string;
  selections?: (Selection & { updated_at: string })[];
  expected_total?: number;
  basket_updated_at?: string;
  checkout_id?: string;
  note?: string;
  address?: string;
  table?: AdminTable;
  user_id?: string;
  role?: string;
}
export function executeDemo(
  input: AppData,
  userId: string,
  command: string,
  args: CommandArgs,
): { data: AppData; result: unknown } {
  const data = structuredClone(input);
  const now = new Date().toISOString();
  const uuid = () => crypto.randomUUID();
  const profile = data.profiles.find((p) => p.id === userId);
  if (!profile) throw new Error("ابتدا وارد حساب شوید.");
  const member = data.business_members.find(
    (m) => m.user_id === userId && m.business_id === args.business_id,
  );
  const admin = profile.role === "admin";
  const requireBuyer = (businessId?: string) => {
    const m = data.business_members.find(
      (m) => m.user_id === userId && m.business_id === businessId,
    );
    if (!admin && (!m || !canBuy(m.role)))
      throw new Error("اجازه انجام این کار را ندارید.");
  };
  const refreshRequests = (businessId: string) => {
    data.material_requests
      .filter(
        (r) =>
          r.business_id === businessId &&
          ["approved", "in_basket"].includes(r.status),
      )
      .forEach((r) => {
        const ri = data.material_request_items.filter(
          (i) => i.request_id === r.id,
        );
        const purchased = (itemId: string) =>
          data.order_items.some(
            (i) => "request_item_id" in i && i.request_item_id === itemId,
          );
        r.status = ri.every((i) => purchased(i.id))
          ? "purchased"
          : ri.some((i) =>
                data.basket_items.some((b) => b.request_item_id === i.id),
              )
            ? "in_basket"
            : "approved";
        r.updated_at = now;
      });
  };
  let result: unknown = null;
  if (command === "onboard_business") {
    const draft = businessSchema.parse(args.data) as BusinessDraft;
    if (data.business_members.some((m) => m.user_id === userId))
      throw new Error("کسب‌وکار شما قبلاً ثبت شده است.");
    const b = { id: uuid(), ...draft, created_at: now };
    data.businesses.push(b);
    data.business_members.push({
      id: uuid(),
      business_id: b.id,
      user_id: userId,
      role: "owner",
    });
    data.procurement_baskets.push({
      id: uuid(),
      business_id: b.id,
      note: "",
      updated_at: now,
    });
    profile.full_name = draft.full_name;
    profile.phone = draft.phone;
    result = b.id;
  } else if (command === "update_business") {
    if (!admin && !["owner", "manager"].includes(member?.role || ""))
      throw new Error("فقط مدیر کسب‌وکار می‌تواند این اطلاعات را تغییر دهد.");
    const draft = businessSchema.parse(
      admin
        ? {
            ...(args.data as Record<string, unknown>),
            full_name: "مدیر سامانه",
          }
        : args.data,
    );
    const b = data.businesses.find((b) => b.id === args.business_id);
    if (!b) throw new Error("کسب‌وکار پیدا نشد.");
    Object.assign(b, draft);
    if (!admin) {
      profile.full_name = draft.full_name;
      profile.phone = draft.phone;
    }
  } else if (command === "create_material_request") {
    if (!member && !admin) throw new Error("عضو این کسب‌وکار نیستید.");
    const draft = requestSchema.parse(args.data) as RequestDraft;
    const requestId = uuid();
    data.material_requests.unshift({
      id: requestId,
      business_id: args.business_id!,
      requested_by: userId,
      urgency: draft.urgency,
      status: "submitted",
      note: draft.note,
      created_at: now,
      updated_at: now,
    });
    for (const item of draft.items) {
      const p = data.products.find((p) => p.id === item.product_id && p.active);
      if (!p) throw new Error("کالای انتخاب‌شده فعال نیست.");
      data.material_request_items.push({
        id: uuid(),
        request_id: requestId,
        ...item,
        unit: p.unit,
      });
    }
    result = requestId;
  } else if (command === "edit_material_request") {
    const request = data.material_requests.find((r) => r.id === args.id);
    if (!request || !["submitted", "reviewing"].includes(request.status))
      throw new Error("فقط درخواست منتظر بررسی قابل ویرایش است.");
    if (request.requested_by !== userId) requireBuyer(request.business_id);
    const draft = requestSchema.parse(args.data);
    data.material_request_items = data.material_request_items.filter(
      (i) => i.request_id !== request.id,
    );
    for (const item of draft.items) {
      const p = data.products.find((p) => p.id === item.product_id && p.active);
      if (!p) throw new Error("کالا فعال نیست.");
      data.material_request_items.push({
        id: uuid(),
        request_id: request.id,
        ...item,
        unit: p.unit,
      });
    }
    request.note = draft.note;
    request.urgency = draft.urgency;
    request.status = "submitted";
    request.updated_at = now;
    result = request.id;
  } else if (
    command === "review_request" ||
    command === "add_request_to_basket"
  ) {
    const request = data.material_requests.find((r) => r.id === args.id);
    if (!request) throw new Error("درخواست پیدا نشد.");
    requireBuyer(request.business_id);
    if (command === "review_request") {
      if (
        !["submitted", "reviewing"].includes(request.status) ||
        !["reviewing", "approved", "rejected"].includes(args.status || "")
      )
        throw new Error("این تغییر وضعیت مجاز نیست.");
      request.status = args.status as RequestStatus;
      request.updated_at = now;
    } else {
      if (!["approved", "in_basket"].includes(request.status))
        throw new Error("ابتدا درخواست را تأیید کنید.");
      const basket = data.procurement_baskets.find(
        (b) => b.business_id === request.business_id,
      )!;
      data.material_request_items
        .filter((i) => i.request_id === request.id)
        .forEach((item) => {
          if (
            !data.basket_items.some((b) => b.request_item_id === item.id) &&
            !data.order_items.some(
              (o) => "request_item_id" in o && o.request_item_id === item.id,
            )
          ) {
            data.basket_items.push({
              id: uuid(),
              basket_id: basket.id,
              product_id: item.product_id,
              quantity: item.quantity,
              note: item.note,
              request_item_id: item.id,
            });
          }
        });
      basket.updated_at = now;
      refreshRequests(request.business_id);
    }
  } else if (command === "edit_basket") {
    requireBuyer(args.business_id);
    const basket = data.procurement_baskets.find(
      (b) => b.business_id === args.business_id,
    );
    if (!basket) throw new Error("سبد خرید پیدا نشد.");
    const draft = args.data as {
      id?: string;
      product_id?: string;
      quantity?: number;
      note?: string;
    };
    if (args.action === "add") {
      if (!data.products.some((p) => p.id === draft.product_id && p.active))
        throw new Error("کالا فعال نیست.");
      data.basket_items.push({
        id: uuid(),
        basket_id: basket.id,
        product_id: draft.product_id!,
        quantity: quantitySchema.parse(draft.quantity),
        note: draft.note || "",
        request_item_id: null,
      });
    } else if (args.action === "update") {
      const item = data.basket_items.find(
        (i) => i.id === draft.id && i.basket_id === basket.id,
      );
      if (!item) throw new Error("قلم پیدا نشد.");
      item.quantity = quantitySchema.parse(draft.quantity);
      item.note = draft.note || "";
    } else if (args.action === "remove")
      data.basket_items = data.basket_items.filter(
        (i) => i.id !== draft.id || i.basket_id !== basket.id,
      );
    else if (args.action === "note")
      basket.note = (draft.note || "").slice(0, 1000);
    else throw new Error("عملیات معتبر نیست.");
    basket.updated_at = now;
    refreshRequests(basket.business_id);
  } else if (command === "checkout") {
    requireBuyer(args.business_id);
    const existing = data.orders.filter(
      (o) =>
        "checkout_id" in o &&
        o.checkout_id === args.checkout_id &&
        o.business_id === args.business_id,
    );
    if (existing.length) return { data, result: existing.map((o) => o.id) };
    const basket = data.procurement_baskets.find(
      (b) => b.business_id === args.business_id,
    );
    if (!basket || basket.updated_at !== args.basket_updated_at)
      throw new Error("سبد تغییر کرده است؛ دوباره مقایسه کنید.");
    if (!args.address || args.address.trim().length < 5)
      throw new Error("نشانی تحویل را کامل وارد کنید.");
    const items = data.basket_items.filter((i) => i.basket_id === basket.id);
    const selections = args.selections || [];
    if (
      selections.some(
        (s) =>
          data.supplier_offers.find((o) => o.id === s.offer_id)?.updated_at !==
          s.updated_at,
      )
    )
      throw new Error("قیمت تغییر کرده است؛ دوباره مقایسه کنید.");
    const quotes = selectedQuotes(items, selections, data);
    if (quotes.reduce((sum, q) => sum + q.total, 0) !== args.expected_total)
      throw new Error("مبلغ تغییر کرده است؛ دوباره بررسی کنید.");
    const ids: string[] = [];
    for (const q of quotes) {
      const order = {
        id: uuid(),
        number: Math.max(1040, ...data.orders.map((o) => o.number)) + 1,
        business_id: args.business_id!,
        supplier_id: q.supplier.id,
        created_by: userId,
        checkout_id: args.checkout_id,
        status: "submitted" as const,
        subtotal: q.subtotal,
        delivery_fee: q.shipping,
        total: q.total,
        delivery_hours: q.hours,
        note: args.note || "",
        address: args.address,
        created_at: now,
      };
      data.orders.unshift(order);
      ids.push(order.id);
      q.items.forEach(({ item, offer, total }) => {
        const p = data.products.find((p) => p.id === item.product_id)!;
        data.order_items.push({
          id: uuid(),
          order_id: order.id,
          product_id: p.id,
          request_item_id: item.request_item_id,
          product_name: p.name,
          quantity: item.quantity,
          unit: p.unit,
          unit_price: offer!.price / offer!.package_size,
          total,
          offer_updated_at: offer!.updated_at,
          note: item.note,
        } as AppData["order_items"][number]);
      });
      data.order_status_history.push({
        id: uuid(),
        order_id: order.id,
        status: "submitted",
        actor: userId,
        actor_name: profile.full_name,
        note: "سفارش نمایشی ثبت شد؛ هیچ سفارشی به تأمین‌کننده ارسال نشده است.",
        created_at: now,
      });
    }
    data.basket_items = data.basket_items.filter(
      (i) => i.basket_id !== basket.id,
    );
    basket.note = "";
    basket.updated_at = now;
    refreshRequests(basket.business_id);
    result = ids;
  } else if (command === "change_order_status") {
    const order = data.orders.find((o) => o.id === args.id);
    if (
      !order ||
      !(
        admin ||
        (profile.role === "supplier" &&
          profile.supplier_id === order.supplier_id)
      )
    )
      throw new Error("اجازه تغییر وضعیت این سفارش را ندارید.");
    if (!canMoveOrder(order.status, args.status as OrderStatus))
      throw new Error("این تغییر وضعیت مجاز نیست.");
    if (args.status === "cancelled" && (args.note || "").trim().length < 3)
      throw new Error("دلیل لغو را بنویسید.");
    order.status = args.status as OrderStatus;
    data.order_status_history.push({
      id: uuid(),
      order_id: order.id,
      status: order.status,
      actor: userId,
      actor_name: profile.full_name,
      note: args.note || "",
      created_at: now,
    });
  } else if (command === "admin_save") {
    if (!admin || !args.table)
      throw new Error("این بخش مخصوص مدیر سامانه است.");
    const records = data[args.table] as unknown as Record<string, unknown>[];
    const draft = { ...(args.data as Record<string, unknown>) };
    const existing = records.find((r) => r.id === draft.id);
    if (args.table === "supplier_offers") {
      if (
        records.some(
          (r) =>
            r.id !== draft.id &&
            r.product_id === draft.product_id &&
            r.supplier_id === draft.supplier_id,
        )
      )
        throw new Error(
          "برای این کالا و تأمین‌کننده قیمت وجود دارد؛ همان ردیف را ویرایش کنید.",
        );
      draft.previous_price =
        existing && existing.price !== draft.price
          ? existing.price
          : existing?.previous_price || null;
      draft.updated_at = now;
    }
    if (existing) Object.assign(existing, draft);
    else records.push({ id: uuid(), ...draft });
  } else if (command === "manage_member") {
    if (!admin && member?.role !== "owner")
      throw new Error("دسترسی کافی ندارید.");
    if (!["manager", "buyer", "employee"].includes(args.role || ""))
      throw new Error("نقش مجاز نیست.");
    const m = data.business_members.find((m) => m.user_id === args.user_id);
    if (m && (m.role === "owner" || m.business_id !== args.business_id))
      throw new Error("نقش مالک یا عضویت در کسب‌وکار دیگر قابل تغییر نیست.");
    if (!m && !admin)
      throw new Error("افزودن عضو توسط مدیر سامانه انجام می‌شود.");
    if (!data.profiles.some((p) => p.id === args.user_id))
      throw new Error("ابتدا کاربر باید ثبت‌نام کند.");
    if (m) m.role = args.role as typeof m.role;
    else
      data.business_members.push({
        id: uuid(),
        business_id: args.business_id!,
        user_id: args.user_id!,
        role: args.role as "employee",
      });
  } else throw new Error("عملیات شناخته نشد.");
  return { data, result };
}
