import type { Metadata } from "next";
import { NightMarket } from "@/components/gacha/NightMarket";

export const metadata: Metadata = {
  title: "Mercado Noturno | AnimesIce",
  description:
    "Revele as cartas e skins da seleção mensal do Mercado Noturno do AnimesIce.",
};

export default function NightMarketPage() {
  return <NightMarket />;
}
