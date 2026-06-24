/**
 * Spending categories used across the app: persona defaults, the spending-input
 * step, and the earn rules on each card. The `key` values are the single source
 * of truth — card earn rules and spending profiles both reference them.
 */

export type CategoryKey =
  | "dining"
  | "groceries"
  | "petrol"
  | "online"
  | "ewallet"
  | "groceriesOnline"
  | "travel"
  | "contactless"
  | "bills"
  | "general";

export interface Category {
  key: CategoryKey;
  label: string;
  /** Short helper shown under the input. */
  hint: string;
  /** Emoji used as a lightweight icon. */
  icon: string;
  /** Fallback monthly spend (RM) when the user does not provide a figure. */
  defaultMonthly: number;
}

export const CATEGORIES: Category[] = [
  {
    key: "dining",
    label: "Dining & Restaurants",
    hint: "Eating out, cafes, food delivery",
    icon: "🍽️",
    defaultMonthly: 400,
  },
  {
    key: "groceries",
    label: "Groceries (in-store)",
    hint: "Supermarkets, hypermarkets",
    icon: "🛒",
    defaultMonthly: 600,
  },
  {
    key: "groceriesOnline",
    label: "Online Groceries",
    hint: "Lazada/Shopee mart, online supermarkets",
    icon: "📦",
    defaultMonthly: 150,
  },
  {
    key: "petrol",
    label: "Petrol",
    hint: "Fuel at any station",
    icon: "⛽",
    defaultMonthly: 350,
  },
  {
    key: "online",
    label: "Online Shopping",
    hint: "Shopee, Lazada, general e-commerce",
    icon: "🛍️",
    defaultMonthly: 400,
  },
  {
    key: "ewallet",
    label: "E-Wallet Reloads",
    hint: "Touch 'n Go, GrabPay, Boost",
    icon: "📱",
    defaultMonthly: 200,
  },
  {
    key: "travel",
    label: "Travel & Airlines",
    hint: "Flights, hotels, overseas spend",
    icon: "✈️",
    defaultMonthly: 200,
  },
  {
    key: "contactless",
    label: "Contactless / Tap",
    hint: "Visa payWave, Mastercard contactless",
    icon: "💳",
    defaultMonthly: 300,
  },
  {
    key: "bills",
    label: "Bills & Utilities",
    hint: "Electricity, water, telco, insurance",
    icon: "🧾",
    defaultMonthly: 250,
  },
  {
    key: "general",
    label: "Everything Else",
    hint: "Any other retail spend",
    icon: "💰",
    defaultMonthly: 500,
  },
];

export const CATEGORY_KEYS: CategoryKey[] = CATEGORIES.map((c) => c.key);

export const CATEGORY_BY_KEY: Record<CategoryKey, Category> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.key] = c;
    return acc;
  },
  {} as Record<CategoryKey, Category>,
);
