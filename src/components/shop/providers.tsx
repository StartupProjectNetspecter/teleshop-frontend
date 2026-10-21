"use client"

import { CartProvider } from "@/lib/cart"
import { CatalogContext } from "@/lib/catalog"
import type { Catalog } from "@/lib/shop-data"
import { ShopTelegramContext, useTelegramSetup } from "@/lib/telegram"

// Wraps every page so the shop page and the /cart page share one catalog and one cart.
export function ShopProviders({
  telegram,
  catalog,
  children,
}: {
  telegram: string
  catalog: Catalog
  children: React.ReactNode
}) {
  useTelegramSetup()
  return (
    <ShopTelegramContext.Provider value={telegram}>
      <CatalogContext.Provider value={catalog}>
        <CartProvider>{children}</CartProvider>
      </CatalogContext.Provider>
    </ShopTelegramContext.Provider>
  )
}
