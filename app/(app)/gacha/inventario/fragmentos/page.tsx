import type { Metadata } from "next";
import { GachaFragments } from "@/components/gacha/GachaFragments";

export const metadata: Metadata = {
  title: "Fragmentos · Inventário | AnimeSice",
  description:
    "Gerencie fragmentos de foil e minerais, forje gemas permanentes, fabrique pedras e melhore suas cartas no Gacha AnimeSice.",
};

export default function GachaFragmentsPage() {
  return <GachaFragments />;
}
