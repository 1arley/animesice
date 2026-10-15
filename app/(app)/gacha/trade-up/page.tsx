import type { Metadata } from "next";
import { GachaTradeUp } from "@/components/gacha/GachaTradeUp";

export const metadata: Metadata = {
  title: "Trade-up | AnimeSice",
  description:
    "Combine cartas ou recicle skins da mesma raridade para forjar novos colecionáveis no Gacha AnimeSice.",
};

export default function TradeUpPage() {
  return <GachaTradeUp />;
}
