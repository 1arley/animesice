import type { Metadata } from "next";
import { GachaRewardsHub } from "@/components/gacha/GachaRewardsHub";

export const metadata: Metadata = {
  title: "Central de Recompensas · Gacha",
  description:
    "Resgate seus Cristais diários, acompanhe seu ritual semanal e gire a Roleta de Prêmios do Gacha do AnimesIce.",
};

export default function GachaRewardsPage() {
  return <GachaRewardsHub />;
}
