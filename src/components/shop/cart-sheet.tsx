"use client"

import { Dialog } from "radix-ui"
import { ArrowLeft, ShoppingBag, X } from "lucide-react"

import { useCart } from "@/lib/cart"
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

// Cart as a side panel: used on phones and inside Telegram. Desktop uses the /cart page.
export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-background shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right sm:max-w-md">
          <CartContent onClose={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CartContent({ onClose }: { onClose: () => void }) {
  const cart = useCart()
  const checkout = useCheckout()
  const { step } = checkout
  const canGoBack = step === "qr" || step === "staff"

  return (
    <>
      <header className="space-y-3 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          {canGoBack && !checkout.isTelegram && (
            <button type="button" onClick={checkout.back} className="-ml-2 flex size-10 items-center justify-center rounded-full hover:bg-secondary" aria-label="ត្រឡប់ក្រោយ">
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div className="flex-1">
            <Dialog.Title className="text-lg font-bold">{STEP_TITLES[step]}</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              {checkout.order ? `លេខកម្ម៉ង់ #${checkout.order.code}` : `${cart.count} មុខទំនិញ`}
            </Dialog.Description>
          </div>
          <Dialog.Close className="flex size-10 items-center justify-center rounded-full hover:bg-secondary" aria-label="បិទ">
            <X className="size-5" />
          </Dialog.Close>
        </div>
        {cart.items.length > 0 && <CheckoutProgress step={step} />}
      </header>

      {step === "done" || step === "staff" ? (
        <div className="flex-1 overflow-y-auto p-5">
          {step === "done" ? <OrderDone checkout={checkout} onContinue={onClose} /> : <StaffSent checkout={checkout} onContinue={onClose} />}
        </div>
      ) : cart.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-secondary">
            <ShoppingBag className="size-9 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">កន្ត្រកនៅទទេ</p>
          <p className="text-muted-foreground">សូមជ្រើសរើសទំនិញដែលអ្នកចូលចិត្ត</p>
          <button type="button" onClick={onClose} className="mt-2 h-11 rounded-xl bg-ink px-6 font-semibold text-ink-foreground">
            ទៅមើលទំនិញ
          </button>
        </div>
      ) : step === "cart" ? (
        <>
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <CartItemList />
            <DeliveryForm checkout={checkout} />
          </div>
          <footer className="space-y-3 border-t bg-card p-5">
            <OrderTotals />
            <BuyOptions checkout={checkout} />
          </footer>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-5">
          <KhqrPayment checkout={checkout} />
        </div>
      )}
    </>
  )
}
