"use client"

import * as React from "react"

// Minimal typings for the parts of the Telegram Mini App API we use.
// Full reference: https://core.telegram.org/bots/webapps
type BottomButton = {
  setParams: (params: {
    text?: string
    color?: string
    text_color?: string
    is_active?: boolean
    is_visible?: boolean
  }) => void
  show: () => void
  hide: () => void
  showProgress: (leaveActive?: boolean) => void
  hideProgress: () => void
  onClick: (cb: () => void) => void
  offClick: (cb: () => void) => void
}

type TelegramWebApp = {
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name?: string; last_name?: string; username?: string; allows_write_to_pm?: boolean }
  }
  version: string
  platform: string
  ready: () => void
  expand: () => void
  isVersionAtLeast: (version: string) => boolean
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  setBottomBarColor?: (color: string) => void
  disableVerticalSwipes?: () => void
  openTelegramLink: (url: string) => void
  openLink: (url: string) => void
  close: () => void
  requestWriteAccess?: (callback?: (granted: boolean) => void) => void
  downloadFile?: (params: { url: string; file_name: string }, callback?: (accepted: boolean) => void) => void
  MainButton: BottomButton
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void
    notificationOccurred: (type: "error" | "success" | "warning") => void
    selectionChanged: () => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

// Colors matching the theme tokens in globals.css
const BACKGROUND = "#fcfaf8"
const PRIMARY = "#d7232d"

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null
  const webApp = window.Telegram?.WebApp
  // The script also loads in normal browsers; initData is only set inside Telegram.
  return webApp && webApp.initData ? webApp : null
}

const noopSubscribe = () => () => {}

/** True when the page is running as a Telegram Mini App. */
export function useIsTelegram() {
  return React.useSyncExternalStore(noopSubscribe, () => !!getWebApp(), () => false)
}

/** Call once at the app root: tells Telegram the app is ready and applies the shop colors. */
export function useTelegramSetup() {
  React.useEffect(() => {
    const wa = getWebApp()
    if (!wa) return
    wa.ready()
    wa.expand()
    if (wa.isVersionAtLeast("6.1")) {
      wa.setHeaderColor(BACKGROUND)
      wa.setBackgroundColor(BACKGROUND)
    }
    if (wa.isVersionAtLeast("7.10")) wa.setBottomBarColor?.(BACKGROUND)
    // Stop a scroll inside the product sheet from swiping the whole Mini App closed
    if (wa.isVersionAtLeast("7.7")) wa.disableVerticalSwipes?.()
  }, [])
}

// Telegram calls every registered back handler, so keep our own stack and only run the newest one
// (e.g. inside checkout, back goes to the previous step before it closes the cart).
const backStack: React.RefObject<() => void>[] = []
let backListening = false

function syncBackButton() {
  const wa = getWebApp()
  if (!wa || !wa.isVersionAtLeast("6.1")) return
  if (!backListening) {
    wa.BackButton.onClick(() => backStack.at(-1)?.current())
    backListening = true
  }
  if (backStack.length) wa.BackButton.show()
  else wa.BackButton.hide()
}

/** Shows Telegram's native back arrow while `visible`, calling `onBack` when pressed. */
export function useTelegramBackButton(visible: boolean, onBack: () => void) {
  const handler = React.useRef(onBack)
  React.useEffect(() => {
    handler.current = onBack
  })

  React.useEffect(() => {
    if (!visible) return
    backStack.push(handler)
    syncBackButton()
    return () => {
      backStack.splice(backStack.indexOf(handler), 1)
      syncBackButton()
    }
  }, [visible])
}

/** Shows Telegram's big bottom button while `visible`. */
export function useTelegramMainButton({
  visible,
  text,
  color = PRIMARY,
  loading = false,
  onClick,
}: {
  visible: boolean
  text: string
  color?: string
  loading?: boolean
  onClick: () => void
}) {
  const handler = React.useRef(onClick)
  React.useEffect(() => {
    handler.current = onClick
  })

  React.useEffect(() => {
    const wa = getWebApp()
    if (!wa || !visible) return
    const cb = () => handler.current()
    wa.MainButton.onClick(cb)
    return () => {
      wa.MainButton.offClick(cb)
      wa.MainButton.hide()
    }
  }, [visible])

  React.useEffect(() => {
    const wa = getWebApp()
    if (!wa || !visible) return
    wa.MainButton.setParams({ text, color, text_color: "#ffffff", is_active: !loading, is_visible: true })
    if (loading) wa.MainButton.showProgress()
    else wa.MainButton.hideProgress()
  }, [visible, text, color, loading])
}

export function haptic(kind: "tap" | "success" | "error") {
  const wa = getWebApp()
  if (!wa || !wa.isVersionAtLeast("6.1")) return
  if (kind === "tap") wa.HapticFeedback.impactOccurred("light")
  else wa.HapticFeedback.notificationOccurred(kind)
}

/** Opens a t.me link: inside Telegram without leaving the app, otherwise in a new tab. */
export function openTelegramLink(url: string) {
  const wa = getWebApp()
  if (wa) wa.openTelegramLink(url)
  else window.open(url, "_blank", "noopener")
}

// The shop's Telegram username (without "@"), provided from the server by <Storefront>
export const ShopTelegramContext = React.createContext("")

/** Link to the shop's Telegram chat, optionally with a prefilled message. */
export function useShopTelegramLink() {
  const username = React.useContext(ShopTelegramContext)
  return (text?: string) => `https://t.me/${username}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}

export function telegramUserName() {
  const user = getWebApp()?.initDataUnsafe.user
  return user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : ""
}

/** Telegram's signed launch data; the backend verifies it to know which Telegram user is ordering. */
export function getInitData() {
  return getWebApp()?.initData ?? ""
}

/** Ask for permission for the bot to message this user (needed to send the receipt). */
export function requestBotMessages(): Promise<boolean> {
  const wa = getWebApp()
  if (!wa) return Promise.resolve(false)
  if (wa.initDataUnsafe.user?.allows_write_to_pm) return Promise.resolve(true)
  if (!wa.requestWriteAccess || !wa.isVersionAtLeast("6.9")) return Promise.resolve(false)
  return new Promise((resolve) => wa.requestWriteAccess!((granted) => resolve(granted)))
}

export function closeMiniApp() {
  getWebApp()?.close()
}

/** Save an image: Telegram's native download inside the Mini App, a normal file download in browsers. */
export async function saveImage(url: string, fileName: string) {
  const absolute = new URL(url, window.location.origin).toString()
  const wa = getWebApp()
  if (wa) {
    if (wa.downloadFile && wa.isVersionAtLeast("8.0")) wa.downloadFile({ url: absolute, file_name: fileName })
    else wa.openLink(absolute) // older Telegram: open the image so it can be long-pressed and saved
    return
  }
  const blob = await (await fetch(absolute)).blob()
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
}
