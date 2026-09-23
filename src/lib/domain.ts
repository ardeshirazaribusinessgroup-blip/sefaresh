import type {
  AppData,
  BasketItem,
  Offer,
  Role,
  Selection,
  Supplier,
  OrderStatus,
} from "./types";
import { statusSteps } from "./types";
export const canBuy = (role: Role) =>
  ["owner", "manager", "buyer", "admin"].includes(role);
export const canManageTeam = (role: Role) => ["owner", "admin"].includes(role);
export const canMoveOrder = (from: OrderStatus, to: OrderStatus) =>
  !["cancelled", "delivered"].includes(from) &&
  (to === statusSteps[statusSteps.indexOf(from) + 1] ||
    (to === "cancelled" && from !== "shipped"));
export function offerProblem(
  item: BasketItem,
  offer: Offer | undefined,
  data: AppData,
): string | null {
  if (!offer || !offer.available) return "قابل تأمین نیست";
  const product = data.products.find((p) => p.id === item.product_id);
  if (!product?.active) return "کالا غیرفعال است";
  if (offer.unit !== product.unit) return "واحد عرضه متفاوت است";
  if (!offer.updated_at || !Number.isFinite(Date.parse(offer.updated_at)))
    return "زمان قیمت نامشخص است";
  if (offer.price <= 0 || offer.package_size <= 0) return "قیمت معتبر نیست";
  if (item.quantity < offer.minimum_quantity) return "کمتر از حداقل مقدار";
  const packages = item.quantity / offer.package_size;
  if (Math.abs(packages - Math.round(packages)) > 0.00001)
    return "مقدار باید مضرب بسته باشد";
  return null;
}
export interface Quote {
  supplier: Supplier;
  items: {
    item: BasketItem;
    offer?: Offer;
    problem: string | null;
    total: number;
  }[];
  subtotal: number;
  shipping: number;
  total: number;
  hours: number;
  covered: number;
  eligible: boolean;
  updated_at: string | null;
  stale: boolean;
}
export function quoteSupplier(
  supplier: Supplier,
  items: BasketItem[],
  data: AppData,
): Quote {
  const lines = items.map((item) => {
    const offer = data.supplier_offers.find(
      (o) => o.supplier_id === supplier.id && o.product_id === item.product_id,
    );
    const problem = offerProblem(item, offer, data);
    return {
      item,
      offer,
      problem,
      total:
        offer && !problem
          ? Math.round((item.quantity / offer.package_size) * offer.price)
          : 0,
    };
  });
  const valid = lines.filter((l) => !l.problem);
  const subtotal = valid.reduce((sum, line) => sum + line.total, 0);
  const shipping = valid.length
    ? Math.max(
        supplier.delivery_fee,
        ...valid.map((l) => l.offer!.delivery_fee),
      )
    : 0;
  const updated = valid.map((l) => l.offer!.updated_at).sort()[0] || null;
  return {
    supplier,
    items: lines,
    subtotal,
    shipping,
    total: subtotal + shipping,
    hours: Math.max(
      supplier.delivery_hours,
      ...valid.map((l) => l.offer!.delivery_hours),
    ),
    covered: valid.length,
    eligible:
      supplier.active &&
      items.length > 0 &&
      valid.length === items.length &&
      subtotal >= supplier.minimum_order,
    updated_at: updated,
    stale: !updated || Date.now() - Date.parse(updated) > 72 * 3600000,
  };
}
export type Criterion = "cost" | "speed" | "single";
export function compareSuppliers(
  items: BasketItem[],
  data: AppData,
  criterion: Criterion,
): Quote[] {
  return data.suppliers
    .filter((s) => s.active)
    .map((s) => quoteSupplier(s, items, data))
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        b.covered - a.covered ||
        (criterion === "speed"
          ? a.hours - b.hours || a.total - b.total
          : a.total - b.total || a.hours - b.hours),
    );
}
export function selectedQuotes(
  items: BasketItem[],
  selections: Selection[],
  data: AppData,
): Quote[] {
  if (
    !items.length ||
    selections.length !== items.length ||
    new Set(selections.map((s) => s.basket_item_id)).size !== items.length
  )
    throw new Error("برای همه اقلام، تأمین‌کننده انتخاب کنید.");
  const groups = new Map<string, BasketItem[]>();
  for (const item of items) {
    const selection = selections.find((s) => s.basket_item_id === item.id);
    const offer = data.supplier_offers.find(
      (o) => o.id === selection?.offer_id && o.product_id === item.product_id,
    );
    const problem = offerProblem(item, offer, data);
    if (!offer || problem)
      throw new Error(problem || "گزینه تأمین معتبر نیست.");
    groups.set(offer.supplier_id, [
      ...(groups.get(offer.supplier_id) || []),
      item,
    ]);
  }
  const quotes = [...groups].map(([id, lines]) => {
    const supplier = data.suppliers.find((s) => s.id === id && s.active);
    if (!supplier) throw new Error("تأمین‌کننده غیرفعال است.");
    return quoteSupplier(supplier, lines, data);
  });
  if (quotes.some((q) => !q.eligible))
    throw new Error("حداقل خرید یا شرایط تأمین رعایت نشده است.");
  return quotes;
}

/** Bounded exhaustive search. Never claims a global optimum if the search cap is reached.
 * Includes delivery once per supplier, minimum orders, matching units and package constraints.
 */
export function optimizeBasket(
  items: BasketItem[],
  data: AppData,
  criterion: Criterion = "cost",
  limit = 200000,
) {
  const candidates = items.map((item) =>
    data.supplier_offers
      .filter(
        (o) =>
          o.product_id === item.product_id &&
          !offerProblem(item, o, data) &&
          data.suppliers.some((s) => s.id === o.supplier_id && s.active),
      )
      .sort((a, b) => a.price / a.package_size - b.price / b.package_size),
  );
  const missing = items.filter((_, i) => !candidates[i].length);
  if (!items.length || missing.length)
    return {
      selections: [] as Selection[],
      quotes: [] as Quote[],
      complete: true,
      missing,
      feasible: false,
    };
  let best: Quote[] = [];
  let bestSelections: Selection[] = [];
  let visited = 0;
  let truncated = false;
  const score = (qs: Quote[]) => {
    const cost = qs.reduce((n, q) => n + q.total, 0);
    const speed = Math.max(...qs.map((q) => q.hours));
    return criterion === "single"
      ? [qs.length, cost, speed]
      : criterion === "speed"
        ? [speed, cost, qs.length]
        : [cost, qs.length, speed];
  };
  const better = (a: Quote[], b: Quote[]) => {
    if (!b.length) return true;
    const x = score(a),
      y = score(b);
    for (let i = 0; i < x.length; i++) {
      if (x[i] !== y[i]) return x[i] < y[i];
    }
    return false;
  };
  for (const q of compareSuppliers(items, data, criterion).filter(
    (q) => q.eligible,
  )) {
    if (better([q], best)) {
      best = [q];
      bestSelections = q.items.map((l) => ({
        basket_item_id: l.item.id,
        offer_id: l.offer!.id,
      }));
    }
  }
  const selections: Selection[] = [];
  function visit(index: number) {
    if (++visited > limit) {
      truncated = true;
      return;
    }
    if (index === items.length) {
      try {
        const qs = selectedQuotes(items, selections, data);
        if (better(qs, best)) {
          best = qs;
          bestSelections = selections.map((s) => ({ ...s }));
        }
      } catch {
        /* An assignment below a supplier minimum is infeasible. */
      }
      return;
    }
    for (const offer of candidates[index]) {
      if (truncated) break;
      selections.push({ basket_item_id: items[index].id, offer_id: offer.id });
      visit(index + 1);
      selections.pop();
    }
  }
  visit(0);
  return {
    selections: bestSelections,
    quotes: best,
    complete: !truncated,
    missing,
    feasible: best.length > 0,
  };
}
