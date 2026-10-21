"use client"

import {
  Briefcase,
  Crown,
  Footprints,
  Layers,
  LayoutGrid,
  Ruler,
  Shirt,
  Trophy,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useCatalog } from "@/lib/catalog"
import type { Category, CategoryId } from "@/lib/shop-data"

const icons: Record<Category["icon"], typeof Shirt> = {
  shirt: Shirt,
  briefcase: Briefcase,
  trophy: Trophy,
  layers: Layers,
  ruler: Ruler,
  footprints: Footprints,
  crown: Crown,
}

export function CategoryIcon({ icon, className }: { icon: Category["icon"]; className?: string }) {
  const Icon = icons[icon]
  return <Icon className={className} />
}

export function CategoryBar({
  active,
  onChange,
}: {
  active: CategoryId | "all"
  onChange: (id: CategoryId | "all") => void
}) {
  const { categories, products } = useCatalog()
  const items = [
    { id: "all" as const, name: "ទាំងអស់", Icon: LayoutGrid, count: products.length },
    ...categories.map((c) => ({
      id: c.id,
      name: c.name,
      Icon: icons[c.icon],
      count: products.filter((p) => p.category === c.id).length,
    })),
  ]

  return (
    <nav aria-label="ប្រភេទទំនិញ" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-3 sm:mx-0 sm:px-0">
      {items.map(({ id, name, Icon, count }) => {
        const selected = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
              selected
                ? "border-ink bg-ink text-ink-foreground shadow-md"
                : "border-border bg-card text-foreground hover:border-foreground/30 hover:bg-secondary"
            )}
          >
            <Icon className="size-4" />
            <span>{name}</span>
            <span
              className={cn(
                "rounded-full px-1.5 text-xs tabular-nums",
                selected ? "bg-white/15" : "bg-secondary text-muted-foreground"
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
