"use client"

import Image from "next/image"
import { Plus } from "lucide-react"

import { useCatalog } from "@/lib/catalog"
import { formatPrice, type Product } from "@/lib/shop-data"

export function ProductBadge({ product }: { product: Product }) {
  if (product.oldPrice) {
    const off = Math.round((1 - product.price / product.oldPrice) * 100)
    return <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">-{off}%</span>
  }
  if (product.badge === "hot") {
    return <span className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-semibold text-amber-950">🔥 លក់ដាច់</span>
  }
  if (product.badge === "new") {
    return <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">ថ្មី</span>
  }
  return null
}

export function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const { categories } = useCatalog()
  const category = categories.find((c) => c.id === product.category)

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5">
      <button type="button" onClick={onOpen} className="text-left" aria-label={`មើល ${product.name}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-secondary">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-2.5 left-2.5">
            <ProductBadge product={product} />
          </div>
        </div>
        <div className="flex flex-col gap-1 p-3 pb-14 sm:p-4 sm:pb-16">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">{category?.name}</span>
            <span className="shrink-0 font-mono">#{product.code}</span>
          </div>
          <h3 className="line-clamp-2 text-sm leading-relaxed font-semibold sm:text-base">{product.name}</h3>
        </div>
      </button>
      <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 sm:inset-x-4 sm:bottom-4">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
          {product.oldPrice && (
            <span className="text-xs text-muted-foreground line-through">{formatPrice(product.oldPrice)}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`បន្ថែម ${product.name} ទៅកន្ត្រក`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-ink-foreground transition-transform hover:scale-110 active:scale-95"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </article>
  )
}
