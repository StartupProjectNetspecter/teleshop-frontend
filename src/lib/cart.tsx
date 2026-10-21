"use client"

import * as React from "react"

import { useCatalog } from "@/lib/catalog"
import type { Product } from "@/lib/shop-data"

export type CartItem = {
  productId: string
  size: string
  qty: number
}

type CartContextValue = {
  items: (CartItem & { product: Product })[]
  count: number
  subtotal: number
  deliveryFee: number
  total: number
  add: (productId: string, size: string, qty?: number) => void
  setQty: (productId: string, size: string, qty: number) => void
  remove: (productId: string, size: string) => void
  clear: () => void
}

const STORAGE_KEY = "teleshop-cart"

const CartContext = React.createContext<CartContextValue | null>(null)

// The cart lives in a small external store backed by localStorage, so it
// survives page reloads and hydrates without a server/client mismatch.
const EMPTY: CartItem[] = []
const listeners = new Set<() => void>()
let cartCache: CartItem[] | null = null

function readStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : EMPTY
  } catch {
    return EMPTY
  }
}

function getSnapshot() {
  if (cartCache === null) cartCache = readStorage()
  return cartCache
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setCart(update: (prev: CartItem[]) => CartItem[]) {
  cartCache = update(getSnapshot())
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartCache))
  } catch {
    // storage can be unavailable (private mode); the cart still works in memory
  }
  listeners.forEach((l) => l())
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cart = React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY)
  const { products, delivery } = useCatalog()

  const value = React.useMemo<CartContextValue>(() => {
    const items = cart.flatMap((item) => {
      const product = products.find((p) => p.id === item.productId)
      return product ? [{ ...item, product }] : []
    })
    const count = items.reduce((sum, i) => sum + i.qty, 0)
    const subtotal = items.reduce((sum, i) => sum + i.qty * i.product.price, 0)
    const deliveryFee =
      count === 0 || subtotal >= delivery.freeFrom ? 0 : delivery.fee

    const same = (i: CartItem, productId: string, size: string) =>
      i.productId === productId && i.size === size

    return {
      items,
      count,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      add: (productId, size, qty = 1) =>
        setCart((prev) =>
          prev.some((i) => same(i, productId, size))
            ? prev.map((i) => (same(i, productId, size) ? { ...i, qty: i.qty + qty } : i))
            : [...prev, { productId, size, qty }]
        ),
      setQty: (productId, size, qty) =>
        setCart((prev) =>
          qty <= 0
            ? prev.filter((i) => !same(i, productId, size))
            : prev.map((i) => (same(i, productId, size) ? { ...i, qty } : i))
        ),
      remove: (productId, size) =>
        setCart((prev) => prev.filter((i) => !same(i, productId, size))),
      clear: () => setCart(() => EMPTY),
    }
  }, [cart, products, delivery])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = React.useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>")
  return ctx
}
