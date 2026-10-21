"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Banknote, QrCode, ShieldCheck, ShoppingBag, Truck } from "lucide-react"

import { useCart } from "@/lib/cart"
import { formatPrice, shop } from "@/lib/shop-data"
import {
  CartItemList,
  BuyOptions,
  CheckoutProgress,
  DeliveryForm,
  KhqrPayment,
  OrderDone,
  OrderTotals,
  STEP_TITLES,
  StaffSent,
  useCheckout,
} from "@/components/shop/checkout"
import { Logo } from "@/components/shop/logo"
import { SiteFooter } from "@/components/shop/storefront"

// Full-page cart for big screens (phones and Telegram use the side panel instead).
export function CartPage() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/" aria-label={shop.name}>
            <Logo tagline={shop.tagline} />
          </Link>
          <Link
            href="/"
            className="flex h-11 items-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold transition hover:bg-secondary"
          >
            <ArrowLeft className="size-4" />
            បន្តទិញទំនិញ
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <CartBody />
      </main>

      <SiteFooter />
    </>
  )
}

function CartBody() {
  const cart = useCart()
  const router = useRouter()
  const checkout = useCheckout()
  const { step } = checkout

  if (step === "done" || step === "staff") {
    return (
      <div className="px-4 py-12">
        {step === "done" ? (
          <OrderDone checkout={checkout} onContinue={() => router.push("/")} />
        ) : (
          <StaffSent checkout={checkout} onContinue={() => router.push("/")} />
        )}
      </div>
    )
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-24 text-center">
        <div className="flex size-24 items-center justify-center rounded-full bg-secondary">
          <ShoppingBag className="size-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">កន្ត្រកនៅទទេ</h1>
        <p className="text-muted-foreground">សូមជ្រើសរើសទំនិញដែលអ្នកចូលចិត្ត</p>
        <Link href="/" className="mt-3 flex h-12 items-center rounded-xl bg-ink px-6 font-semibold text-ink-foreground">
          ទៅមើលទំនិញ
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{STEP_TITLES[step]}</h1>
          <p className="text-muted-foreground">
            {checkout.order ? `លេខកម្ម៉ង់ #${checkout.order.code}` : `${cart.count} មុខទំនិញ · សរុប ${formatPrice(cart.total)}`}
          </p>
        </div>
        <CheckoutProgress step={step} className="w-full max-w-md" />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {step === "cart" && (
            <>
              <CartItemList large />
              <DeliveryForm checkout={checkout} className="p-5 sm:p-6" />
            </>
          )}
          {step !== "cart" && (
            <div className="mx-auto max-w-lg">
              <button type="button" onClick={checkout.back} className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <ArrowLeft className="size-4" /> ត្រឡប់ក្រោយ
              </button>
              <KhqrPayment checkout={checkout} />
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold">សង្ខេបការកម្ម៉ង់</h2>
            {step !== "cart" && (
              <ul className="space-y-1.5 border-b pb-4 text-sm">
                {cart.items.map((i) => (
                  <li key={`${i.productId}-${i.size}`} className="flex justify-between gap-3">
                    <span className="line-clamp-1">
                      {i.product.name} <span className="text-muted-foreground">({i.size}) x{i.qty}</span>
                    </span>
                    <span className="shrink-0">{formatPrice(i.qty * i.product.price)}</span>
                  </li>
                ))}
              </ul>
            )}
            <OrderTotals />
            {step === "cart" && <BuyOptions checkout={checkout} />}
          </div>
          <ul className="space-y-3 rounded-2xl border bg-card p-5 text-sm">
            <li className="flex items-center gap-3">
              <Truck className="size-5 text-primary" /> ភ្នំពេញ ដឹកដល់ក្នុង ១-២ ថ្ងៃ
            </li>
            <li className="flex items-center gap-3">
              <QrCode className="size-5 text-primary" /> បង់ប្រាក់តាម KHQR (ធនាគារណាក៏បាន)
            </li>
            <li className="flex items-center gap-3">
              <Banknote className="size-5 text-primary" /> ទទួលវិក្កយបត្រតាម Telegram
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-primary" /> ប្ដូរបានក្នុង ៣ ថ្ងៃ បើទំហំមិនត្រូវ
            </li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
