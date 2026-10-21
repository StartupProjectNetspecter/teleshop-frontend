"use client"

import * as React from "react"
import Image from "next/image"
import { Dialog } from "radix-ui"
import { Check, Minus, Plus, Send, ShoppingBag, Truck, X } from "lucide-react"

import { useCart } from "@/lib/cart"
import { useCatalog } from "@/lib/catalog"
import { formatPrice, type Product } from "@/lib/shop-data"
import { haptic } from "@/lib/telegram"
import { cn } from "@/lib/utils"
import { ProductBadge } from "@/components/shop/product-card"

export function ProductSheet({
  product,
  onClose,
  onBuyNow,
}: {
  product: Product | null
  onClose: () => void
  onBuyNow: () => void
}) {
  return (
    <Dialog.Root open={!!product} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(92vw,880px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl",
            "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95"
          )}
        >
          {product && <ProductDetail key={product.id} product={product} onClose={onClose} onBuyNow={onBuyNow} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ProductDetail({
  product,
  onClose,
  onBuyNow,
}: {
  product: Product
  onClose: () => void
  onBuyNow: () => void
}) {
  const cart = useCart()
  const inStock = (s: string) => (product.stock?.[s] ?? 0) > 0
  const available = product.sizes.filter(inStock)
  const [size, setSize] = React.useState<string | null>(available.length === 1 ? available[0] : null)
  const [qty, setQty] = React.useState(1)
  const [needSize, setNeedSize] = React.useState(false)
  const { categories, delivery } = useCatalog()
  const category = categories.find((c) => c.id === product.category)

  function addToCart(then: () => void) {
    if (!size) {
      setNeedSize(true)
      haptic("error")
      return
    }
    cart.add(product.id, size, qty)
    haptic("success")
    then()
  }

  return (
    <>
      <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-border sm:hidden" />
      <Dialog.Close
        className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md backdrop-blur transition hover:bg-white"
        aria-label="បិទ"
      >
        <X className="size-5" />
      </Dialog.Close>

      <div className="grid min-h-0 flex-1 overflow-y-auto sm:grid-cols-2">
        <div className="relative aspect-square bg-secondary sm:aspect-auto sm:min-h-130">
          <Image src={product.image} alt={product.name} fill sizes="(min-width: 640px) 440px, 100vw" className="object-cover" priority />
          <div className="absolute top-4 left-4">
            <ProductBadge product={product} />
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-7">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{category?.name}</span>
              <span>•</span>
              <span className="font-mono">#{product.code}</span>
            </div>
            <Dialog.Title className="text-xl leading-relaxed font-bold sm:text-2xl">{product.name}</Dialog.Title>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
              {product.oldPrice && (
                <span className="text-base text-muted-foreground line-through">{formatPrice(product.oldPrice)}</span>
              )}
            </div>
            <Dialog.Description className="leading-relaxed text-muted-foreground">{product.description}</Dialog.Description>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold">១. ជ្រើសរើសទំហំ (Size)</span>
              {needSize && !size && <span className="text-sm font-medium text-primary">សូមជ្រើសរើសទំហំ!</span>}
            </div>
            <div className={cn("flex flex-wrap gap-2 rounded-xl", needSize && !size && "ring-2 ring-primary/40 ring-offset-4 ring-offset-card")}>
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!inStock(s)}
                  onClick={() => {
                    setSize(s)
                    setQty((q) => Math.min(q, product.stock[s]))
                    haptic("tap")
                  }}
                  aria-pressed={size === s}
                  className={cn(
                    "relative flex h-11 min-w-12 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-semibold transition",
                    size === s ? "border-ink bg-ink text-ink-foreground" : "bg-card hover:border-foreground/40",
                    "disabled:cursor-not-allowed disabled:border-dashed disabled:bg-secondary disabled:text-muted-foreground/60 disabled:line-through"
                  )}
                >
                  {size === s && <Check className="size-3.5" />}
                  {s}
                  {!inStock(s) && <span className="absolute -top-2 -right-1.5 rounded-full bg-muted-foreground px-1 text-[10px] text-white no-underline">អស់</span>}
                </button>
              ))}
            </div>
            {available.length === 0 ? (
              <p className="text-sm font-medium text-primary">សុំទោស ទំនិញនេះអស់ពីស្តុកហើយ។ សូមសួរបុគ្គលិកតាម Telegram។</p>
            ) : (
              size &&
              product.stock[size] <= 3 && <p className="text-sm font-medium text-amber-700">⚡ ទំហំ {size} នៅសល់តែ {product.stock[size]} ប៉ុណ្ណោះ</p>
            )}
          </div>

          <div className="space-y-2.5">
            <span className="font-semibold">២. ចំនួន</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl border">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex size-11 items-center justify-center" aria-label="បន្ថយ">
                  <Minus className="size-4" />
                </button>
                <span className="w-10 text-center text-lg font-semibold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => (size ? Math.min(q + 1, product.stock[size]) : q + 1))}
                  className="flex size-11 items-center justify-center"
                  aria-label="បន្ថែម"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <span className="text-muted-foreground">
                សរុប <b className="text-foreground">{formatPrice(product.price * qty)}</b>
              </span>
            </div>
          </div>

          <div className="mt-auto space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => addToCart(onClose)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-ink font-semibold transition hover:bg-secondary"
              >
                <ShoppingBag className="size-4" />
                ដាក់កន្ត្រក
              </button>
              <button
                type="button"
                onClick={() => addToCart(onBuyNow)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110"
              >
                <Send className="size-4" />
                ទិញឥឡូវ
              </button>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="size-4 shrink-0" />
              ដឹកជញ្ជូនឥតគិតថ្លៃ ពេលទិញចាប់ពី {formatPrice(delivery.freeFrom)}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
