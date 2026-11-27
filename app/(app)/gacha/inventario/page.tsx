import type { Metadata } from "next";
import { GachaInventory } from "@/components/gacha/GachaInventory";

export const metadata: Metadata = {
  title: "Inventário | AnimeSice",
  description:
    "Gerencie suas caixas, essências, pedras prontas, gemas e proteção de reroll no Gacha AnimeSice.",
};

export default function GachaInventoryPage() {
  return <GachaInventory />;
}
