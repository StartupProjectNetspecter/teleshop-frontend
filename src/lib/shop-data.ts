// Products, categories and delivery prices come from the backend (GET /api/v1/catalog,
// edit backend/app/data/catalog.json). This file keeps the shop's own details and shared types.

export const shop = {
  name: "TeleShop",
  tagline: "ហាងអនឡាញ ទិញងាយតាម Telegram",
  // The Telegram username comes from TELEGRAM_USERNAME in frontend/.env (see app/layout.tsx)
  // TODO: put your real Facebook page and phone here
  facebook: "https://facebook.com/your.page",
  phone: "012 345 678",
  address: "ភ្នំពេញ, កម្ពុជា",
  hours: "ម៉ោង ៨:០០ ព្រឹក - ៩:០០ យប់ (រៀងរាល់ថ្ងៃ)",
}

export type CategoryId = string

export type Category = {
  id: CategoryId
  name: string
  icon: "shirt" | "briefcase" | "trophy" | "layers" | "ruler" | "footprints" | "crown"
}

export type Product = {
  id: string
  code: string
  name: string
  category: CategoryId
  price: number
  oldPrice?: number
  image: string
  sizes: string[]
  /** Pieces left per size, e.g. { M: 3, L: 0 } (from the backend stock database) */
  stock: Record<string, number>
  badge?: "new" | "hot"
  description: string
}

export type Catalog = {
  delivery: { fee: number; freeFrom: number }
  categories: Category[]
  products: Product[]
}

export function formatPrice(value: number) {
  return `$${value.toFixed(2)}`
}
