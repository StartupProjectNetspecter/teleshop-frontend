"use client"

import * as React from "react"
import {
  ArrowRight,
  Banknote,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react"

import { useRouter } from "next/navigation"

import { useCart } from "@/lib/cart"
import {
  haptic,
  openTelegramLink,
  useIsTelegram,
  useShopTelegramLink,
  useTelegramBackButton,
  useTelegramMainButton,
} from "@/lib/telegram"
import { useCatalog } from "@/lib/catalog"
import { formatPrice, shop, type CategoryId, type Product } from "@/lib/shop-data"
import { CartSheet } from "@/components/shop/cart-sheet"
import { CategoryBar, CategoryIcon } from "@/components/shop/category-bar"
import { Logo, LogoMark } from "@/components/shop/logo"
import { ProductCard } from "@/components/shop/product-card"
import { ProductSheet } from "@/components/shop/product-sheet"

export function Storefront() {
  const [category, setCategory] = React.useState<CategoryId | "all">("all")
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<Product | null>(null)
  const [cartOpen, setCartOpen] = React.useState(false)
  const shopRef = React.useRef<HTMLDivElement>(null)
  const cart = useCart()
  const { categories, products } = useCatalog()
  const router = useRouter()
  const isTelegram = useIsTelegram()

  // Big screens get the full /cart page; phones and Telegram get the side panel
  function openCart() {
    if (!isTelegram && window.matchMedia("(min-width: 1024px)").matches) router.push("/cart")
    else setCartOpen(true)
  }

  // Telegram Mini App: native back arrow closes sheets, native bottom button opens the cart
  useTelegramBackButton(!!selected || cartOpen, () => (selected ? setSelected(null) : setCartOpen(false)))
  useTelegramMainButton({
    visible: cart.count > 0 && !selected && !cartOpen,
    text: `មើលកន្ត្រក (${cart.count}) · ${formatPrice(cart.total)}`,
    onClick: () => {
      haptic("tap")
      setCartOpen(true)
    },
  })

  const q = query.trim().toLowerCase()
  const filtered = products.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
  )

  function chooseCategory(id: CategoryId | "all") {
    setCategory(id)
    shopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <AnnouncementBar />
      <SiteHeader query={query} onQuery={setQuery} onCart={openCart} />

      <main className="flex-1">
        <div ref={shopRef} className="scroll-mt-16">
          <div className="sticky top-16 z-30 border-b bg-background/85 backdrop-blur-lg">
            <div className="mx-auto max-w-7xl px-4">
              <CategoryBar active={category} onChange={chooseCategory} />
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
            {q ? (
              <ProductSection
                title={`លទ្ធផលស្វែងរក “${query.trim()}”`}
                subtitle={`រកឃើញ ${filtered.length} មុខ`}
                products={filtered}
                onOpen={setSelected}
                empty={
                  <EmptyState
                    onReset={() => {
                      setQuery("")
                      setCategory("all")
                    }}
                  />
                }
              />
            ) : category === "all" ? (
              <div className="space-y-12">
                {categories.map((c) => (
                  <ProductSection
                    key={c.id}
                    icon={<CategoryIcon icon={c.icon} className="size-5" />}
                    title={c.name}
                    products={products.filter((p) => p.category === c.id).slice(0, 4)}
                    onOpen={setSelected}
                    action={
                      <button
                        type="button"
                        onClick={() => chooseCategory(c.id)}
                        className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        មើលទាំងអស់ <ArrowRight className="size-4" />
                      </button>
                    }
                  />
                ))}
              </div>
            ) : (
              <ProductSection
                title={categories.find((c) => c.id === category)?.name ?? ""}
                subtitle={`${filtered.length} មុខ`}
                products={filtered}
                onOpen={setSelected}
              />
            )}
          </div>
        </div>

        <Features />
      </main>

      <SiteFooter />
      <FloatingCartBar onOpen={openCart} />

      <ProductSheet
        product={selected}
        onClose={() => setSelected(null)}
        onBuyNow={() => {
          setSelected(null)
          openCart()
        }}
      />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </>
  )
}

function SiteHeader({
  query,
  onQuery,
  onCart,
}: {
  query: string
  onQuery: (q: string) => void
  onCart: () => void
}) {
  const { count } = useCart()
  const isTelegram = useIsTelegram()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <a href="#" className="flex shrink-0 items-center" aria-label={shop.name}>
          <LogoMark className="size-10 drop-shadow-md sm:hidden" />
          <Logo className="hidden sm:flex" tagline={shop.tagline} />
        </a>

        <label className="relative ml-auto flex h-11 w-full max-w-xl items-center sm:mx-auto">
          <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="ស្វែងរកទំនិញ ឬលេខកូដ..."
            className="h-full w-full rounded-full border bg-card pr-10 pl-10 text-base outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:ring-3 focus:ring-primary/15 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => onQuery("")} className="absolute right-3 text-muted-foreground" aria-label="លុប">
              <X className="size-4" />
            </button>
          )}
        </label>

        {!isTelegram && (
          <ShopChatLink className="hidden h-11 shrink-0 items-center gap-2 rounded-full bg-[#229ED9] px-4 text-sm font-semibold text-white transition hover:brightness-110 md:flex">
            <Send className="size-4" />
            Telegram
          </ShopChatLink>
        )}

        <button
          type="button"
          onClick={onCart}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-ink-foreground transition hover:scale-105"
          aria-label="កន្ត្រក"
        >
          <ShoppingBag className="size-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

function ProductSection({
  title,
  subtitle,
  icon,
  action,
  products,
  onOpen,
  empty,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  products: Product[]
  onOpen: (p: Product) => void
  empty?: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {icon && <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">{icon}</span>}
          <div>
            <h2 className="text-xl leading-relaxed font-bold sm:text-2xl">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {products.length === 0 && empty ? (
        empty
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={() => onOpen(p)} />
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card py-16 text-center">
      <Search className="size-10 text-muted-foreground" />
      <p className="text-lg font-semibold">រកមិនឃើញទំនិញនេះទេ</p>
      <p className="text-muted-foreground">សាកល្បងពាក្យផ្សេង ឬសួរយើងតាម Telegram</p>
      <button type="button" onClick={onReset} className="mt-2 h-11 rounded-xl bg-ink px-5 font-semibold text-ink-foreground">
        មើលទំនិញទាំងអស់
      </button>
    </div>
  )
}

/** Red bar above the header with the shop's main promises, slowly scrolling. */
function AnnouncementBar() {
  const { delivery } = useCatalog()
  const messages = [
    "🕐 ទិញទំនិញគ្រប់មុខបាន 24 ម៉ោង • 7 ថ្ងៃ",
    `🚚 ដឹកជញ្ជូនឥតគិតថ្លៃ ពេលទិញចាប់ពី ${formatPrice(delivery.freeFrom)}`,
    "💳 បង់ប្រាក់ងាយៗ ស្កេន KHQR ធនាគារណាក៏បាន",
    "🤖 មានអ្នកលក់ឆ្លើយតបតាម Telegram ជានិច្ច",
  ]
  return (
    <div className="overflow-hidden bg-linear-to-r from-primary via-[#f0434b] to-primary py-2 text-sm font-medium text-primary-foreground">
      <div className="flex w-max animate-[marquee_28s_linear_infinite] motion-reduce:animate-none">
        {/* Two copies so the loop has no gap */}
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-12 pr-12" aria-hidden={copy === 1}>
            {messages.map((m) => (
              <span key={m} className="whitespace-nowrap">
                {m}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Features() {
  const { delivery } = useCatalog()
  const items = [
    { Icon: Clock, title: "ទិញបាន 24 ម៉ោង", text: "ទំនិញគ្រប់មុខ រៀងរាល់ថ្ងៃ" },
    { Icon: Truck, title: "ដឹកជញ្ជូនរហ័ស", text: `ភ្នំពេញ ១ ថ្ងៃ • ឥតគិតថ្លៃពី ${formatPrice(delivery.freeFrom)}` },
    { Icon: Banknote, title: "បង់ប្រាក់ងាយៗ", text: "ស្កេន KHQR ធនាគារណាក៏បាន" },
    { Icon: ShieldCheck, title: "ប្ដូរបានក្នុង ៣ ថ្ងៃ", text: "បើទំហំមិនត្រូវ" },
  ]
  return (
    <section className="mx-auto max-w-7xl px-4 pb-10">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(({ Icon, title, text }) => (
          <div key={title} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-ink pb-24 text-ink-foreground sm:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <Logo dark />
          <p className="max-w-xs leading-relaxed text-white/65">{shop.tagline} — គុណភាពល្អ តម្លៃសមរម្យ សម្រាប់បុរសខ្មែរ។</p>
        </div>
        <div className="space-y-3">
          <p className="font-semibold">ទំនាក់ទំនង</p>
          <ul className="space-y-2.5 text-white/70">
            <li className="flex items-center gap-2.5"><Phone className="size-4" /> {shop.phone}</li>
            <li className="flex items-center gap-2.5"><MapPin className="size-4" /> {shop.address}</li>
            <li className="flex items-center gap-2.5"><Clock className="size-4" /> {shop.hours}</li>
          </ul>
        </div>
        <div className="space-y-3">
          <p className="font-semibold">តាមដានយើង</p>
          <div className="flex flex-wrap gap-2.5">
            <ShopChatLink className="flex h-11 items-center gap-2 rounded-xl bg-[#229ED9] px-4 font-semibold">
              <Send className="size-4" /> Telegram
            </ShopChatLink>
            <a href={shop.facebook} target="_blank" rel="noreferrer" className="flex h-11 items-center gap-2 rounded-xl bg-[#1877F2] px-4 font-semibold">
              <MessageCircle className="size-4" /> Facebook
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-sm text-white/50">
        © {new Date().getFullYear()} {shop.name}. រក្សាសិទ្ធិគ្រប់យ៉ាង។
      </div>
    </footer>
  )
}

function ShopChatLink({ className, children }: { className: string; children: React.ReactNode }) {
  const url = useShopTelegramLink()()
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={(e) => {
        e.preventDefault()
        openTelegramLink(url)
      }}
    >
      {children}
    </a>
  )
}

function FloatingCartBar({ onOpen }: { onOpen: () => void }) {
  const { count, total } = useCart()
  const isTelegram = useIsTelegram()
  // Inside Telegram the native bottom button does this job
  if (count === 0 || isTelegram) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="flex h-14 w-full animate-in items-center justify-between rounded-2xl bg-primary px-5 font-semibold text-primary-foreground shadow-2xl shadow-primary/40 slide-in-from-bottom-4 fade-in-0"
      >
        <span className="flex items-center gap-2.5">
          <span className="relative">
            <ShoppingBag className="size-5" />
            <span className="absolute -top-2 -right-2.5 flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-primary">
              {count}
            </span>
          </span>
          <span className="ml-1">មើលកន្ត្រក</span>
        </span>
        <span className="text-lg">{formatPrice(total)}</span>
      </button>
    </div>
  )
}
