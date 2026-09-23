export type Role =
  "owner" | "manager" | "buyer" | "employee" | "supplier" | "admin";
export type RequestStatus =
  | "submitted"
  | "reviewing"
  | "approved"
  | "rejected"
  | "in_basket"
  | "purchased";
export type OrderStatus =
  | "submitted"
  | "reviewing"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";
export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  supplier_id: string | null;
}
export interface Business {
  id: string;
  name: string;
  type: string;
  city: string;
  area: string;
  address: string;
  phone: string;
  created_at: string;
}
export interface Member {
  id: string;
  business_id: string;
  user_id: string;
  role: Role;
}
export interface Category {
  id: string;
  name: string;
}
export interface Product {
  id: string;
  name: string;
  category_id: string;
  brand: string;
  unit: string;
  package_size: number;
  description: string;
  active: boolean;
}
export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  whatsapp: string;
  address: string;
  service_area: string;
  minimum_order: number;
  delivery_hours: number;
  delivery_fee: number;
  active: boolean;
  notes: string;
}
export interface Offer {
  id: string;
  supplier_id: string;
  product_id: string;
  price: number;
  previous_price: number | null;
  unit: string;
  package_size: number;
  minimum_quantity: number;
  available: boolean;
  delivery_fee: number;
  delivery_hours: number;
  updated_at: string;
}
export interface MaterialRequest {
  id: string;
  business_id: string;
  requested_by: string;
  urgency: "normal" | "urgent";
  status: RequestStatus;
  note: string;
  created_at: string;
  updated_at: string;
}
export interface RequestItem {
  id: string;
  request_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  note: string;
}
export interface Basket {
  id: string;
  business_id: string;
  note: string;
  updated_at: string;
}
export interface BasketItem {
  id: string;
  basket_id: string;
  product_id: string;
  quantity: number;
  note: string;
  request_item_id: string | null;
}
export interface Order {
  id: string;
  number: number;
  business_id: string;
  supplier_id: string;
  created_by: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_hours: number;
  note: string;
  address: string;
  created_at: string;
}
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  request_item_id?: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  offer_updated_at: string;
  note: string;
}
export interface StatusEvent {
  id: string;
  order_id: string;
  status: OrderStatus;
  actor: string;
  actor_name: string;
  note: string;
  created_at: string;
}
export interface AppData {
  profiles: Profile[];
  businesses: Business[];
  business_members: Member[];
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  supplier_offers: Offer[];
  material_requests: MaterialRequest[];
  material_request_items: RequestItem[];
  procurement_baskets: Basket[];
  basket_items: BasketItem[];
  orders: Order[];
  order_items: OrderItem[];
  order_status_history: StatusEvent[];
}
export interface RequestDraft {
  items: { product_id: string; quantity: number; note: string }[];
  urgency: "normal" | "urgent";
  note: string;
}
export interface BusinessDraft {
  name: string;
  type: string;
  full_name: string;
  phone: string;
  city: string;
  area: string;
  address: string;
}
export interface Selection {
  basket_item_id: string;
  offer_id: string;
}
export type AdminTable =
  "products" | "categories" | "suppliers" | "supplier_offers";
export const requestLabels: Record<RequestStatus, string> = {
  submitted: "ثبت شده",
  reviewing: "در حال بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
  in_basket: "اضافه شده به خرید",
  purchased: "خریداری شده",
};
export const orderLabels: Record<OrderStatus, string> = {
  submitted: "ثبت شد",
  reviewing: "در حال بررسی",
  confirmed: "تأیید تأمین‌کننده",
  preparing: "در حال آماده‌سازی",
  shipped: "ارسال شد",
  delivered: "تحویل شد",
  cancelled: "لغو شد",
};
export const roleLabels: Record<Role, string> = {
  owner: "مالک کسب‌وکار",
  manager: "مدیر",
  buyer: "مسئول خرید",
  employee: "کارمند",
  supplier: "تأمین‌کننده",
  admin: "مدیر سامانه",
};
export const statusSteps: OrderStatus[] = [
  "submitted",
  "reviewing",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
];
