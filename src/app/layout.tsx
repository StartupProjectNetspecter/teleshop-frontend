import type { Metadata, Viewport } from "next";
import { Kantumruy_Pro } from "next/font/google";
import Script from "next/script";
import { ShopProviders } from "@/components/shop/providers";
import { fetchCatalog } from "@/lib/api";
import "./globals.css";

const kantumruy = Kantumruy_Pro({
  variable: "--font-kantumruy",
  subsets: ["khmer", "latin"],
});

export const metadata: Metadata = {
  title: "TeleShop | ហាងអនឡាញ ទិញងាយតាម Telegram",
  description: "អាវយឺត អាវសឺមី អាវបាល់ ខោ ស្បែកជើង — កម្ម៉ង់ងាយៗតាម Telegram",
};

export const viewport: Viewport = {
  themeColor: "#fcfaf8",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read on the server from frontend/.env, e.g. TELEGRAM_USERNAME=@my_shop
  const telegram = (process.env.TELEGRAM_USERNAME ?? "").trim().replace(/^@/, "");
  if (!telegram) {
    console.warn("TELEGRAM_USERNAME is not set in frontend/.env; Telegram order links will not work.");
  }

  const catalog = await fetchCatalog();

  return (
    <html
      lang="km"
      className={`${kantumruy.variable} h-full antialiased`}
      // telegram-web-app.js adds --tg-viewport-* styles to <html> before React hydrates
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Telegram Mini App API; harmless in a normal browser */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        {catalog ? (
          <ShopProviders telegram={telegram} catalog={catalog}>
            {children}
          </ShopProviders>
        ) : (
          <main className="m-auto max-w-md p-8 text-center">
            <h1 className="text-2xl font-bold">ហាងកំពុងថែទាំ</h1>
            <p className="mt-2 text-muted-foreground">មិនអាចភ្ជាប់ទៅម៉ាស៊ីនមេបានទេ។ សូមសាកម្ដងទៀតបន្តិចទៀត។</p>
            <p className="mt-4 text-xs text-muted-foreground">(Backend not reachable: check BACKEND_URL in frontend/.env)</p>
          </main>
        )}
      </body>
    </html>
  );
}
