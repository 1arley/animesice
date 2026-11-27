import type { Metadata } from "next";
import { GachaInventory } from "@/components/gacha/GachaInventory";

export const metadata: Metadata = {
  title: "Inventário | AnimeSice",
  description:
    "Acompanhe seus saldos, abra essências e gerencie proteções de reroll no Gacha AnimeSice.",
};

export default function GachaInventoryPage() {
  return <GachaInventory />;
}
