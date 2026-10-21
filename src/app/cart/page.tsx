import type { Metadata } from "next";

import { CartPage } from "@/components/shop/cart-page";

export const metadata: Metadata = {
  title: "កន្ត្រក | TeleShop",
};

export default function Cart() {
  return <CartPage />;
}
