"use client"

import * as React from "react"
import Image from "next/image"
import {
  Check,
  CheckCircle2,
  Clock,
  Download,
  Headset,
  Loader2,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  Trash2,
  Truck,
} from "lucide-react"

import { api, ApiError, type Order, type OrderPaid, type StaffRequest } from "@/lib/api"
import { useCart } from "@/lib/cart"
import { useCatalog } from "@/lib/catalog"
import { formatPrice } from "@/lib/shop-data"
import {
  closeMiniApp,
  getInitData,
  haptic,
  openTelegramLink,
  requestBotMessages,
  saveImage,
  telegramUserName,
  useIsTelegram,
  useTelegramBackButton,
  useTelegramMainButton,
} from "@/lib/telegram"
import { cn } from "@/lib/utils"

// Shared by the cart side panel (phones, Telegram) and the /cart page (desktop).
// Two ways to buy:
//   1. Buy directly: cart & details -> KHQR card with a 10-minute countdown -> done (receipt).
//   2. Buy with our staff: the cart is sent to the Telegram bot, where the AI seller takes over.

export type CheckoutStep = "cart" | "qr" | "done" | "staff"

const PAID_GREEN = "#16a34a"
const TELEGRAM_BLUE = "#229ED9"

/** Seconds left until `deadline` (ms timestamp), updated every second. */
function useSecondsLeft(deadline: number | null) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!deadline) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [deadline])
  return deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0
}

export function useCheckout() {
  const cart = useCart()
  const isTelegram = useIsTelegram()
  // Inside the Telegram Mini App we already know the customer's name
  const [name, setName] = React.useState(telegramUserName)
  const [phone, setPhone] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [showErrors, setShowErrors] = React.useState(false)

  const [step, setStep] = React.useState<CheckoutStep>("cart")
  const [order, setOrder] = React.useState<Order | null>(null)
  const [deadline, setDeadline] = React.useState<number | null>(null)
  const [paid, setPaid] = React.useState<OrderPaid | null>(null)
  const [staff, setStaff] = React.useState<StaffRequest | null>(null)
  const [busy, setBusy] = React.useState<"order" | "renew" | "paid" | "staff" | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const secondsLeft = useSecondsLeft(deadline)
  const expired = step === "qr" && secondsLeft === 0

  const missingName = !name.trim()
  const missingPhone = phone.replace(/\D/g, "").length < 8
  const missingAddress = address.trim().length < 5

  async function run(what: NonNullable<typeof busy>, task: () => Promise<void>) {
    setBusy(what)
    setError(null)
    try {
      await task()
    } catch (err) {
      haptic("error")
      setError(err instanceof ApiError ? err.message : "មានបញ្ហាបន្តិច។ សូមសាកម្ដងទៀត។")
    } finally {
      setBusy(null)
    }
  }

  const cartItems = () => cart.items.map((i) => ({ productId: i.productId, size: i.size, qty: i.qty }))
  const customer = () => ({ name: name.trim(), phone: phone.trim(), address: address.trim() })

  function showQr(next: Order) {
    setOrder(next)
    setDeadline(Date.now() + next.expiresIn * 1000)
    setStep("qr")
  }

  /** Option 1: buy directly with KHQR. */
  function continueToPayment() {
    if (missingName || missingPhone || missingAddress) {
      setShowErrors(true)
      haptic("error")
      return
    }
    haptic("tap")
    void run("order", async () => showQr(await api.createOrder({ items: cartItems(), customer: customer(), initData: getInitData() })))
  }

  /** Option 2: send the cart to our Telegram bot, where the AI seller / staff continue. */
  function buyWithStaff() {
    haptic("tap")
    void run("staff", async () => {
      if (isTelegram) await requestBotMessages()
      const result = await api.requestStaff({ items: cartItems(), customer: customer(), initData: getInitData() })
      setStaff(result)
      haptic("success")
      // The bot already wrote to the customer: close the Mini App so they land in the chat
      if (isTelegram && result.sentToTelegram) setTimeout(closeMiniApp, 1200)
      setStep("staff")
    })
  }

  function renewQr() {
    if (!order) return
    haptic("tap")
    void run("renew", async () => showQr(await api.renewQr(order.code, order.token)))
  }

  function confirmPaid() {
    if (!order) return
    void run("paid", async () => {
      if (isTelegram) await requestBotMessages()
      const result = await api.markPaid(order.code, order.token, getInitData())
      setPaid(result)
      setDeadline(null)
      cart.clear()
      haptic("success")
      // Receipt is already in the customer's Telegram chat: close the Mini App
      if (isTelegram && result.receiptSent) setTimeout(closeMiniApp, 1200)
      setStep("done")
    })
  }

  function back() {
    // Cart may change now, so a new order (and QR) is made next time
    setError(null)
    setOrder(null)
    setDeadline(null)
    setStep("cart")
  }

  // Telegram: the big bottom button drives each step, the back arrow returns to the cart
  useTelegramMainButton({
    visible: (step === "cart" && cart.items.length > 0) || step === "qr",
    text: step === "cart" ? `ទិញផ្ទាល់ · ស្កេន QR · ${formatPrice(cart.total)}` : expired ? "បង្កើត QR ថ្មី" : "ខ្ញុំបានបង់ប្រាក់រួចហើយ",
    color: step === "qr" && !expired ? PAID_GREEN : undefined,
    loading: busy !== null && busy !== "staff",
    onClick: step === "cart" ? continueToPayment : expired ? renewQr : confirmPaid,
  })
  useTelegramBackButton(step === "qr" || step === "staff", back)

  return {
    step,
    form: { name, setName, phone, setPhone, address, setAddress },
    errors: {
      name: showErrors && missingName ? "សូមបញ្ចូលឈ្មោះ" : undefined,
      phone: showErrors && missingPhone ? "សូមបញ្ចូលលេខទូរស័ព្ទឲ្យត្រឹមត្រូវ" : undefined,
      address: showErrors && missingAddress ? "សូមបញ្ចូលអាសយដ្ឋានដឹកជញ្ជូន" : undefined,
    },
    order,
    paid,
    staff,
    busy,
    error,
    secondsLeft,
    expired,
    isTelegram,
    continueToPayment,
    buyWithStaff,
    renewQr,
    confirmPaid,
    back,
  }
}

export type Checkout = ReturnType<typeof useCheckout>

export const STEP_TITLES: Record<CheckoutStep, string> = {
  cart: "កន្ត្រករបស់អ្នក",
  qr: "ស្កេន KHQR ដើម្បីបង់ប្រាក់",
  done: "ការកម្ម៉ង់ជោគជ័យ",
  staff: "ទិញជាមួយបុគ្គលិក",
}

export function CheckoutProgress({ step, className }: { step: CheckoutStep; className?: string }) {
  if (step === "staff") return null
  const steps = [
    { id: "cart", label: "កន្ត្រក" },
    { id: "qr", label: "បង់ប្រាក់" },
    { id: "done", label: "រួចរាល់" },
  ] as const
  const current = steps.findIndex((s) => s.id === step)
  return (
    <ol className={cn("flex items-center gap-2", className)}>
      {steps.map((s, i) => (
        <li key={s.id} className="flex flex-1 items-center gap-2 last:flex-none">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
              i < current ? "bg-emerald-500 text-white" : i === current ? "bg-ink text-ink-foreground" : "bg-secondary text-muted-foreground"
            )}
          >
            {i < current ? <Check className="size-4" /> : i + 1}
          </span>
          <span className={cn("text-sm font-medium", i === current ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
          {i < steps.length - 1 && <span className={cn("h-0.5 flex-1 rounded-full", i < current ? "bg-emerald-500" : "bg-border")} />}
        </li>
      ))}
    </ol>
  )
}

export function CartItemList({ large }: { large?: boolean }) {
  const cart = useCart()
  return (
    <ul className="space-y-3">
      {cart.items.map((item) => (
        <li key={`${item.productId}-${item.size}`} className={cn("flex gap-3 rounded-2xl border bg-card", large ? "gap-4 p-3" : "p-2.5")}>
          <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-secondary", large ? "size-28" : "size-20")}>
            <Image src={item.product.image} alt={item.product.name} fill sizes={large ? "112px" : "80px"} className="object-cover" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("line-clamp-1 font-semibold", large && "text-lg")}>{item.product.name}</p>
              <button
                type="button"
                onClick={() => cart.remove(item.productId, item.size)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                aria-label="លុប"
              >
                <Trash2 className="size-4" />
                {large && "លុប"}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Size: <b className="text-foreground">{item.size}</b> · #{item.product.code}
              {large && <> · {formatPrice(item.product.price)} / មួយ</>}
            </p>
            <div className="mt-auto flex items-center justify-between">
              <div className="flex items-center rounded-lg border">
                <button type="button" onClick={() => cart.setQty(item.productId, item.size, item.qty - 1)} className="flex size-8 items-center justify-center" aria-label="បន្ថយ">
                  <Minus className="size-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
                <button type="button" onClick={() => cart.setQty(item.productId, item.size, item.qty + 1)} className="flex size-8 items-center justify-center" aria-label="បន្ថែម">
                  <Plus className="size-3.5" />
                </button>
              </div>
              <span className={cn("font-bold", large && "text-lg")}>{formatPrice(item.qty * item.product.price)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function DeliveryForm({ checkout, className }: { checkout: Checkout; className?: string }) {
  const { form, errors } = checkout
  return (
    <section className={cn("space-y-3 rounded-2xl border bg-card p-4", className)}>
      <h3 className="font-semibold">ព័ត៌មានដឹកជញ្ជូន</h3>
      <Field label="ឈ្មោះ" error={errors.name}>
        <input value={form.name} onChange={(e) => form.setName(e.target.value)} placeholder="ឧ. សុខ ដារា" className={inputClass} autoComplete="name" />
      </Field>
      <Field label="លេខទូរស័ព្ទ" error={errors.phone}>
        <input value={form.phone} onChange={(e) => form.setPhone(e.target.value)} placeholder="ឧ. 012 345 678" inputMode="tel" className={inputClass} autoComplete="tel" />
      </Field>
      <Field label="អាសយដ្ឋានដឹកជញ្ជូន" error={errors.address}>
        <textarea
          value={form.address}
          onChange={(e) => form.setAddress(e.target.value)}
          placeholder="ផ្ទះលេខ ផ្លូវ សង្កាត់ ខណ្ឌ ខេត្ត..."
          rows={2}
          className={cn(inputClass, "h-auto py-2.5")}
          autoComplete="street-address"
        />
      </Field>
    </section>
  )
}

export function OrderTotals() {
  const cart = useCart()
  const { delivery } = useCatalog()
  return (
    <div className="space-y-1.5 text-sm">
      <Row label="តម្លៃទំនិញ" value={formatPrice(cart.subtotal)} />
      <Row
        label="ថ្លៃដឹកជញ្ជូន"
        value={cart.deliveryFee === 0 ? <span className="font-semibold text-emerald-600">ឥតគិតថ្លៃ</span> : formatPrice(cart.deliveryFee)}
      />
      {cart.deliveryFee > 0 && (
        <p className="rounded-lg bg-accent px-3 py-2 text-accent-foreground">
          ទិញបន្ថែម {formatPrice(delivery.freeFrom - cart.subtotal)} ទៀត ដើម្បីដឹកឥតគិតថ្លៃ 🚚
        </p>
      )}
      <div className="flex items-center justify-between pt-1 text-lg font-bold">
        <span>សរុប</span>
        <span className="text-primary">{formatPrice(cart.total)}</span>
      </div>
    </div>
  )
}

/** Cart step: the two ways to buy. Inside Telegram the native bottom button is "buy directly". */
export function BuyOptions({ checkout }: { checkout: Checkout }) {
  const { busy } = checkout
  return (
    <div className="space-y-2.5">
      {!checkout.isTelegram && (
        <button
          type="button"
          onClick={checkout.continueToPayment}
          disabled={!!busy}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-4 text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-110 disabled:opacity-70"
        >
          {busy === "order" ? <Loader2 className="size-5 animate-spin" /> : <QrCode className="size-5" />}
          <span className="text-left leading-tight">
            <span className="block text-base font-semibold">ទិញផ្ទាល់ · ស្កេន QR</span>
            <span className="block text-xs opacity-85">បង់ប្រាក់ភ្លាមៗ តាម KHQR</span>
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={checkout.buyWithStaff}
        disabled={!!busy}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl border-2 px-4 transition hover:bg-sky-50 disabled:opacity-70"
        style={{ borderColor: TELEGRAM_BLUE, color: TELEGRAM_BLUE }}
      >
        {busy === "staff" ? <Loader2 className="size-5 animate-spin" /> : <Headset className="size-5" />}
        <span className="text-left leading-tight">
          <span className="block text-base font-semibold">ទិញជាមួយបុគ្គលិក</span>
          <span className="block text-xs opacity-85">ជជែកសួរ និងបញ្ជាទិញតាម Telegram</span>
        </span>
      </button>
      <ErrorNote error={checkout.error} />
    </div>
  )
}

function formatClock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

/** Buy directly: KHQR card with a 10-minute countdown, save button and "I already paid". */
export function KhqrPayment({ checkout }: { checkout: Checkout }) {
  const { order, busy, error, secondsLeft, expired } = checkout
  const [saving, setSaving] = React.useState(false)
  if (!order) return null
  const urgent = secondsLeft <= 60
  const progress = Math.min(100, (secondsLeft / 600) * 100)

  async function save() {
    setSaving(true)
    try {
      await saveImage(order!.qrUrl, `KHQR-${order!.code}.png`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl px-4 py-3",
          expired ? "bg-secondary text-muted-foreground" : urgent ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
        )}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Clock className="size-4" />
          {expired ? "QR ផុតកំណត់ហើយ" : "សូមបង់ប្រាក់ក្នុងរយៈពេល"}
        </span>
        <span className={cn("font-mono text-2xl font-bold tabular-nums", urgent && !expired && "animate-pulse")}>{formatClock(secondsLeft)}</span>
      </div>
      <div className="-mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", urgent ? "bg-red-500" : "bg-amber-400")}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="relative mx-auto max-w-sm overflow-hidden rounded-3xl border bg-white shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element -- KHQR card rendered by our API */}
        <img
          src={order.qrUrl}
          alt={`KHQR ${formatPrice(order.total)}`}
          width={560}
          height={844}
          className={cn("block h-auto w-full", expired && "opacity-25 blur-[3px]")}
        />
        {expired && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-xl font-bold">QR ផុតកំណត់ហើយ</p>
            <p className="text-sm text-muted-foreground">សូមបង្កើត QR ថ្មី ដើម្បីបង់ប្រាក់</p>
            {!checkout.isTelegram && (
              <button
                type="button"
                onClick={checkout.renewQr}
                disabled={!!busy}
                className="flex h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-lg disabled:opacity-70"
              >
                {busy === "renew" ? <Loader2 className="size-5 animate-spin" /> : <RefreshCw className="size-5" />}
                បង្កើត QR ថ្មី
              </button>
            )}
          </div>
        )}
      </div>

      {!expired && (
        <>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink font-semibold transition hover:bg-secondary disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
            រក្សាទុក QR
          </button>

          <ol className="space-y-1.5 text-sm text-muted-foreground">
            <li>១. ស្កេន QR ឬរក្សាទុក ហើយបើកក្នុងកម្មវិធីធនាគារណាមួយ (ABA, ACLEDA, Wing…)</li>
            <li>២. បង់ប្រាក់ {formatPrice(order.total)}</li>
            <li>៣. ចុច «ខ្ញុំបានបង់ប្រាក់រួចហើយ» ដើម្បីទទួលវិក្កយបត្រ</li>
          </ol>

          {!checkout.isTelegram && (
            <button
              type="button"
              onClick={checkout.confirmPaid}
              disabled={!!busy}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-70"
              style={{ background: PAID_GREEN }}
            >
              {busy === "paid" ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
              ខ្ញុំបានបង់ប្រាក់រួចហើយ
            </button>
          )}
        </>
      )}
      <ErrorNote error={error} />

      <button type="button" onClick={checkout.back} className="w-full text-center text-sm text-muted-foreground underline">
        ត្រឡប់ទៅកែកន្ត្រក
      </button>
    </div>
  )
}

/** Buy with staff: the cart was sent to Telegram. */
export function StaffSent({ checkout, onContinue }: { checkout: Checkout; onContinue: () => void }) {
  const { staff } = checkout
  if (!staff) return null
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-sky-50" style={{ color: TELEGRAM_BLUE }}>
        <Headset className="size-10" />
      </span>
      <div>
        <h2 className="text-2xl font-bold">បានផ្ញើទៅបុគ្គលិករបស់យើង!</h2>
        <p className="mt-1 leading-relaxed text-muted-foreground">
          {staff.sentToTelegram
            ? "សូមបើក Telegram។ អ្នកលក់របស់យើងបានផ្ញើសារទៅអ្នករួចហើយ ហើយនឹងជួយពិនិត្យស្តុក និងផ្ញើ QR សម្រាប់បង់ប្រាក់។"
            : "ចុចប៊ូតុងខាងក្រោម ដើម្បីបើក Telegram ហើយចុច Start។ អ្នកលក់របស់យើងនឹងជួយពិនិត្យស្តុក និងផ្ញើ QR សម្រាប់បង់ប្រាក់។"}
        </p>
      </div>
      {staff.botUrl && (
        <button
          type="button"
          onClick={() => openTelegramLink(staff.botUrl!)}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-white shadow-lg transition hover:brightness-110"
          style={{ background: TELEGRAM_BLUE }}
        >
          <Send className="size-5" /> បើក Telegram
        </button>
      )}
      <button type="button" onClick={onContinue} className="text-sm text-muted-foreground underline">
        បន្តមើលទំនិញ
      </button>
    </div>
  )
}

/** Buy directly, final step: thank-you. In Telegram the receipt is already in the chat and the app closes. */
export function OrderDone({ checkout, onContinue }: { checkout: Checkout; onContinue: () => void }) {
  const { paid, order } = checkout
  if (!paid || !order) return null
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <CheckCircle2 className="size-16 text-emerald-500" />
      <div>
        <h2 className="text-2xl font-bold">អរគុណសម្រាប់ការកម្ម៉ង់!</h2>
        <p className="text-muted-foreground">
          លេខកម្ម៉ង់ <b className="text-foreground">#{paid.code}</b> · {formatPrice(order.total)}
        </p>
      </div>

      <div className="flex w-full items-center gap-3 rounded-2xl bg-sky-50 p-4 text-left text-sky-900">
        <Truck className="size-8 shrink-0" />
        <div>
          <p className="text-sm text-sky-700">ពេលវេលាដឹកជញ្ជូនប្រហែល</p>
          <p className="font-semibold">{paid.etaText}</p>
        </div>
      </div>

      {paid.receiptSent ? (
        <p className="rounded-2xl bg-emerald-50 p-4 text-emerald-800">
          ✅ វិក្កយបត្រត្រូវបានផ្ញើទៅ Telegram របស់អ្នករួចហើយ។ យើងនឹងពិនិត្យការបង់ប្រាក់ ហើយជូនដំណឹងអ្នកឆាប់ៗ។
        </p>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- receipt PNG rendered by our API */}
          <img src={paid.receiptUrl} alt="វិក្កយបត្រ" className="w-full rounded-2xl border shadow-sm" />
          <div className="grid w-full gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => saveImage(paid.receiptUrl, `TeleShop-${paid.code}.png`)}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-ink font-semibold transition hover:bg-secondary"
            >
              <Download className="size-5" /> ទាញយកវិក្កយបត្រ
            </button>
            {paid.botUrl && (
              <button
                type="button"
                onClick={() => openTelegramLink(paid.botUrl!)}
                className="flex h-12 items-center justify-center gap-2 rounded-xl font-semibold text-white transition hover:brightness-110"
                style={{ background: TELEGRAM_BLUE }}
              >
                <Send className="size-5" /> ទទួលតាម Telegram
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">ចុច «ទទួលតាម Telegram» ហើយចុច Start ដើម្បីទទួលវិក្កយបត្រ និងដំណឹងពីការដឹកជញ្ជូន។</p>
        </>
      )}

      <button type="button" onClick={onContinue} className="mt-1 h-12 rounded-xl bg-ink px-6 font-semibold text-ink-foreground">
        បន្តទិញទំនិញ
      </button>
    </div>
  )
}

function ErrorNote({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  if (!error) return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <span>{error}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 font-semibold underline">
          សាកម្ដងទៀត
        </button>
      )}
    </div>
  )
}

const inputClass =
  "h-11 w-full rounded-xl border bg-background px-3.5 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-3 focus:ring-primary/15"

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span className="block text-sm text-primary">{error}</span>}
    </label>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
