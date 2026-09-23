import type { AppData, Role } from "./types";
export const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const demoUsers: {
  id: string;
  role: Role;
  name: string;
  email: string;
}[] = [
  {
    id: id(1),
    role: "owner",
    name: "سارا احمدی",
    email: "owner@sefaresh.demo",
  },
  {
    id: id(2),
    role: "buyer",
    name: "مهدی رضایی",
    email: "buyer@sefaresh.demo",
  },
  {
    id: id(3),
    role: "employee",
    name: "نیما کریمی",
    email: "employee@sefaresh.demo",
  },
  {
    id: id(4),
    role: "admin",
    name: "مدیر سفارش",
    email: "admin@sefaresh.demo",
  },
  {
    id: id(5),
    role: "supplier",
    name: "مسئول پخش آفتاب",
    email: "supplier@sefaresh.demo",
  },
];
export function createSeed(): AppData {
  const now = new Date();
  const ago = (hours: number) =>
    new Date(now.getTime() - hours * 3600000).toISOString();
  const categoryNames = [
    "قهوه و نوشیدنی",
    "لبنیات",
    "شیرینی و نان",
    "سیروپ و طعم‌دهنده",
    "شکلات",
    "مواد اولیه آشپزخانه",
    "میوه و سبزی",
    "بسته‌بندی",
    "مواد شوینده",
    "اقلام مصرفی",
  ];
  const names = [
    "دانه قهوه ۷۰ / ۳۰",
    "شیر پرچرب",
    "سیروپ وانیل",
    "شکلات تلخ ۷۰٪",
    "خامه قنادی",
    "لیوان کاغذی",
    "نان کروسان",
    "پودر کاکائو",
    "پرتقال تازه",
    "مایع ظرف‌شویی",
    "دستمال کاغذی",
    "شکر سفید",
  ];
  const categories = [0, 1, 3, 4, 1, 7, 2, 4, 6, 8, 9, 5];
  const units = [
    "کیلوگرم",
    "لیتر",
    "بطری",
    "کیلوگرم",
    "کیلوگرم",
    "بسته",
    "عدد",
    "کیلوگرم",
    "کیلوگرم",
    "بطری",
    "بسته",
    "کیلوگرم",
  ];
  const prices = [
    780000, 52000, 315000, 485000, 148000, 135000, 48000, 380000, 85000, 68000,
    42000, 65000,
  ];
  const products = names.map((name, i) => ({
    id: id(100 + i),
    name,
    category_id: id(50 + categories[i]),
    brand: ["رُست کرمان", "دامداران", "مونین", "کارما", "کاله", "پاک"][i] || "",
    unit: units[i],
    package_size: 1,
    description:
      [
        "ترکیب ۷۰٪ عربیکا و ۳۰٪ روبوستا، رُست مدیوم",
        "شیر تازه ۳٪ چربی؛ بسته یک لیتری",
        "بطری ۷۰۰ میلی‌لیتری",
        "مناسب نوشیدنی و دسر",
        "خامه یک کیلوگرمی",
        "بسته ۵۰ عددی، ۲۲۰ میلی‌لیتر",
      ][i] || "مناسب مصرف حرفه‌ای کافه و رستوران",
    active: true,
  }));
  const suppliers = [
    "پخش آفتاب کرمان",
    "تأمین گستر پارس",
    "بازرگانی سپهر",
    "کافه‌کالا",
  ].map((name, i) => ({
    id: id(200 + i),
    name,
    contact_person: ["آقای محمدی", "خانم رضایی", "آقای شریفی", "خانم احمدی"][i],
    phone: "",
    whatsapp: "",
    address: [
      "کرمان، بلوار جمهوری",
      "کرمان، خیابان شریعتی",
      "کرمان، بلوار هوانیروز",
      "کرمان، خیابان هزار و یک شب",
    ][i],
    service_area: "محدوده شهر کرمان",
    minimum_order: [500000, 1000000, 300000, 800000][i],
    delivery_hours: [6, 24, 12, 4][i],
    delivery_fee: [50000, 0, 35000, 75000][i],
    active: true,
    notes: "اطلاعات فرضی برای نمایش محصول؛ این تأمین‌کننده واقعی نیست.",
  }));
  const offers = suppliers.flatMap((supplier, si) =>
    products.map((p, pi) => ({
      id: id(300 + si * 20 + pi),
      supplier_id: supplier.id,
      product_id: p.id,
      price:
        Math.round((prices[pi] * [1, 0.96, 1.025, 1.07][si]) / 1000) * 1000,
      previous_price:
        pi === 0 || pi === 1
          ? Math.round((prices[pi] * [0.97, 1.02, 1, 1][si]) / 1000) * 1000
          : null,
      unit: p.unit,
      package_size: 1,
      minimum_quantity: 1,
      available: !(si === 2 && pi === 2) && !(si === 3 && pi > 5),
      delivery_fee: 0,
      delivery_hours: supplier.delivery_hours,
      updated_at: ago([2, 5, 12, 80][si]),
    })),
  );
  const requests: AppData["material_requests"] = [
    {
      id: id(500),
      business_id: id(10),
      requested_by: id(3),
      urgency: "urgent",
      status: "submitted",
      note: "برای شیفت عصر نیاز داریم.",
      created_at: ago(1),
      updated_at: ago(1),
    },
    {
      id: id(501),
      business_id: id(10),
      requested_by: id(2),
      urgency: "normal",
      status: "submitted",
      note: "خرید هفتگی بار",
      created_at: ago(3),
      updated_at: ago(3),
    },
    {
      id: id(502),
      business_id: id(10),
      requested_by: id(3),
      urgency: "normal",
      status: "approved",
      note: "",
      created_at: ago(20),
      updated_at: ago(5),
    },
    {
      id: id(503),
      business_id: id(10),
      requested_by: id(1),
      urgency: "normal",
      status: "in_basket",
      note: "تکمیل مواد اولیه این هفته",
      created_at: ago(24),
      updated_at: ago(2),
    },
  ];
  const requestItems: AppData["material_request_items"] = [
    {
      id: id(600),
      request_id: id(500),
      product_id: id(101),
      quantity: 12,
      unit: "لیتر",
      note: "",
    },
    {
      id: id(601),
      request_id: id(501),
      product_id: id(100),
      quantity: 3,
      unit: "کیلوگرم",
      note: "ترکیب همیشگی",
    },
    {
      id: id(602),
      request_id: id(502),
      product_id: id(105),
      quantity: 4,
      unit: "بسته",
      note: "",
    },
    {
      id: id(603),
      request_id: id(503),
      product_id: id(100),
      quantity: 2,
      unit: "کیلوگرم",
      note: "",
    },
    {
      id: id(604),
      request_id: id(503),
      product_id: id(101),
      quantity: 12,
      unit: "لیتر",
      note: "",
    },
    {
      id: id(605),
      request_id: id(503),
      product_id: id(102),
      quantity: 2,
      unit: "بطری",
      note: "",
    },
  ];
  const orderStatuses = [
    "preparing",
    "shipped",
    "delivered",
    "delivered",
    "delivered",
  ] as const;
  const orders = orderStatuses.map((status, i) => ({
    id: id(800 + i),
    number: 1040 - i,
    business_id: id(10),
    supplier_id: id(200 + (i % 3)),
    created_by: id(1),
    status,
    subtotal: prices[i] * [3, 24, 4, 2, 6][i],
    delivery_fee: suppliers[i % 3].delivery_fee,
    total: prices[i] * [3, 24, 4, 2, 6][i] + suppliers[i % 3].delivery_fee,
    delivery_hours: suppliers[i % 3].delivery_hours,
    note: "",
    address: "کرمان، بلوار جمهوری، کافه نمونه",
    created_at: ago([4, 18, 72, 120, 180][i]),
  }));
  return {
    profiles: demoUsers.map((u) => ({
      id: u.id,
      full_name: u.name,
      phone: "",
      role: u.role === "admin" || u.role === "supplier" ? u.role : "employee",
      supplier_id: u.role === "supplier" ? id(200) : null,
    })),
    businesses: [
      {
        id: id(10),
        name: "کافه نمونه کرمان",
        type: "کافه",
        city: "کرمان",
        area: "بلوار جمهوری",
        address: "کرمان، بلوار جمهوری، کافه نمونه",
        phone: "",
        created_at: ago(240),
      },
    ],
    business_members: demoUsers
      .slice(0, 3)
      .map((u, i) => ({
        id: id(20 + i),
        business_id: id(10),
        user_id: u.id,
        role: u.role,
      })),
    categories: categoryNames.map((name, i) => ({ id: id(50 + i), name })),
    products,
    suppliers,
    supplier_offers: offers,
    material_requests: requests,
    material_request_items: requestItems,
    procurement_baskets: [
      { id: id(700), business_id: id(10), note: "", updated_at: ago(2) },
    ],
    basket_items: requestItems
      .slice(3)
      .map((r, i) => ({
        id: id(710 + i),
        basket_id: id(700),
        product_id: r.product_id,
        quantity: r.quantity,
        note: r.note,
        request_item_id: r.id,
      })),
    orders,
    order_items: orders.map((o, i) => ({
      id: id(850 + i),
      order_id: o.id,
      product_id: id(100 + i),
      product_name: products[i].name,
      quantity: [3, 24, 4, 2, 6][i],
      unit: units[i],
      unit_price: prices[i],
      total: o.subtotal,
      offer_updated_at: o.created_at,
      note: "",
    })),
    order_status_history: orders.flatMap((o, i) => {
      const steps = [
        "submitted",
        "reviewing",
        "confirmed",
        "preparing",
        "shipped",
        "delivered",
      ] as const;
      return steps
        .slice(0, steps.indexOf(o.status) + 1)
        .map((status, j) => ({
          id: id(900 + i * 10 + j),
          order_id: o.id,
          status,
          actor: id(4),
          actor_name: "مدیر سفارش",
          note: j === 0 ? "داده نمایشی" : "",
          created_at: new Date(
            Date.parse(o.created_at) + j * 600000,
          ).toISOString(),
        }));
    }),
  };
}
