import * as React from "react"

import { cn } from "@/lib/utils"

// Same artwork as src/app/icon.svg (the favicon). Keep them in sync.
export function LogoMark({ className }: { className?: string }) {
  const id = React.useId()
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0434b" />
          <stop offset="1" stopColor="#b8121d" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id})`} />
      <path d="M24 22v-2.5a8 8 0 0 1 16 0V22" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M16.6 22h30.8a2 2 0 0 1 2 1.86l1.9 26.5A3.4 3.4 0 0 1 47.9 54H16.1a3.4 3.4 0 0 1-3.4-3.64l1.9-26.5a2 2 0 0 1 2-1.86Z"
        fill="#fff"
      />
      <path
        d="M21.4 37.6 41.3 29.9c.9-.35 1.7.45 1.5 1.4l-3.4 16c-.25 1.1-1.2 1.45-2.1.85l-5.4-4-2.6 2.5c-.3.3-.75.15-.75-.3l.25-4.6 8.9-8.1c.4-.35-.1-.55-.6-.25l-11 6.9-4.7-1.5c-1-.3-1-1 .2-1.45Z"
        fill="#d7232d"
      />
    </svg>
  )
}

/** Logo mark + "TeleShop" wordmark. */
export function Logo({ className, tagline, dark }: { className?: string; tagline?: string; dark?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="size-10 drop-shadow-md" />
      <span className="leading-tight">
        <span className="block text-lg font-extrabold tracking-tight">
          <span className={dark ? "text-white" : "text-ink"}>Tele</span>
          <span className="text-primary">Shop</span>
        </span>
        {tagline && <span className={cn("block text-xs", dark ? "text-white/60" : "text-muted-foreground")}>{tagline}</span>}
      </span>
    </span>
  )
}
