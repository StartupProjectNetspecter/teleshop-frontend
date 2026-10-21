"use client"

import * as React from "react"

import type { Catalog } from "@/lib/shop-data"

// Loaded from the backend once per request in app/layout.tsx
export const CatalogContext = React.createContext<Catalog>({
  delivery: { fee: 0, freeFrom: 0 },
  categories: [],
  products: [],
})

export function useCatalog() {
  return React.useContext(CatalogContext)
}
