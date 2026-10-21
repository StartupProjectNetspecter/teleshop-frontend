// Calls to the TeleShop backend. The browser uses relative /api/v1 URLs, which next.config.ts
// forwards to BACKEND_URL, so the website and Telegram Mini App only need one public address.

import type { Catalog } from "@/lib/shop-data"

export type Order = {
  code: string
  token: string
  status: string
  total: number
  subtotal: number
  deliveryFee: number
  merchantName: string
  /** KHQR payment card image (PNG) for this order */
  qrUrl: string
  /** Seconds until the QR expires, counted when the response was made */
  expiresIn: number
  etaText: string
  botUrl: string | null
}

export type OrderPaid = {
  code: string
  status: string
  receiptSent: boolean
  etaText: string
  botUrl: string | null
  receiptUrl: string
}

export type StaffRequest = {
  /** t.me link that opens the bot chat with this cart */
  botUrl: string | null
  /** True when the bot already messaged the customer (ordering from inside Telegram) */
  sentToTelegram: boolean
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 0
  ) {
    super(message)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    })
  } catch {
    throw new ApiError("មិនអាចភ្ជាប់ទៅម៉ាស៊ីនមេបានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយសាកម្ដងទៀត។")
  }
  if (!response.ok) {
    throw new ApiError(
      response.status === 401
        ? "សូមបើកកម្មវិធីឡើងវិញពី Telegram។"
        : response.status === 410
          ? "QR ផុតកំណត់ហើយ។ សូមបង្កើត QR ថ្មី។"
          : response.status === 409
            ? "សុំទោស ទំនិញខ្លះក្នុងកន្ត្រកអស់ពីស្តុក ឬមិនគ្រប់ចំនួន។ សូមកែកន្ត្រក ឬទិញជាមួយបុគ្គលិក។"
            : "មានបញ្ហាបន្តិច។ សូមសាកម្ដងទៀត។",
      response.status
    )
  }
  return response.json() as Promise<T>
}

export const api = {
  createOrder: (body: {
    items: { productId: string; size: string; qty: number }[]
    customer: { name: string; phone: string; address: string }
    initData: string
  }) => request<Order>("/orders", { method: "POST", body: JSON.stringify(body) }),
  renewQr: (code: string, token: string) =>
    request<Order>(`/orders/${code}/renew`, { method: "POST", body: JSON.stringify({ token }) }),
  requestStaff: (body: {
    items: { productId: string; size: string; qty: number }[]
    customer: { name: string; phone: string; address: string }
    initData: string
  }) => request<StaffRequest>("/staff-requests", { method: "POST", body: JSON.stringify(body) }),
  markPaid: (code: string, token: string, initData: string) =>
    request<OrderPaid>(`/orders/${code}/paid`, { method: "POST", body: JSON.stringify({ token, initData }) }),
}

/** Server-side only: load the shop catalog from the backend. */
export async function fetchCatalog(): Promise<Catalog | null> {
  const backend = process.env.BACKEND_URL
  if (!backend) return null
  try {
    const response = await fetch(`${backend}/api/v1/catalog`, { cache: "no-store" })
    return response.ok ? ((await response.json()) as Catalog) : null
  } catch {
    return null
  }
}
