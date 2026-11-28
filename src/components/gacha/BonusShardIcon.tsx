import Image from "next/image";
import type { GachaBonusDropKind } from "@/types";

/**
 * Selo de recompensa bônus na revelação da carta: fragmentos de pedras
 * ou Giro da Roleta de Prêmios.
 * Tipos internos "DRACONICA*" são os mesmos fragmentos exibidos como
 * "Magnetita*" em todo o gacha.
 */
export const SHARD_ICONS: Partial<Record<GachaBonusDropKind, { src: string; label: string }>> = {
  TITANITA: { src: "/gacha/titanita.png", label: "Fragmento de Titanita" },
  TITANITA_SOMBRIA: { src: "/gacha/titanita-sombria.png", label: "Fragmento de Titanita Sombria" },
  DRACONICA: { src: "/gacha/magnetita.png", label: "Fragmento de Magnetita" },
  SOMBRIA_DRACONICA: { src: "/gacha/magnetita-sombria.png", label: "Fragmento de Magnetita Sombria" },
  ROULETTE_SPIN: { src: "/gacha/roleta-premios.png", label: "Giro da Roleta de Prêmios" },
};

/**
 * Ícone pequeno da recompensa bônus. Para fragmentos, o selo aparece apenas
 * na prévia de giro e sai no resgate. Para `ROULETTE_SPIN`, o giro é creditado
 * automaticamente ao saldo do jogador.
 */
export function BonusShardIcon({ kind, className = "" }: { kind: GachaBonusDropKind; className?: string }) {
  const icon = SHARD_ICONS[kind];
  if (!icon) return null;
  const isRoulette = kind === "ROULETTE_SPIN";
  return (
    <span
      title={
        isRoulette
          ? `${icon.label} · +1 giro creditado ao seu saldo`
          : `${icon.label} · veio junto com esta carta`
      }
      className={`inline-flex shrink-0 items-center justify-center rounded-full border p-0.5 ${
        isRoulette
          ? "border-ice/70 bg-ink/90 shadow-[0_0_12px_rgba(56,232,218,0.45)]"
          : "border-white/25 bg-ink/70 shadow-[0_0_6px_rgba(0,0,0,0.45)]"
      } ${className}`}
    >
      <Image src={icon.src} alt={icon.label} width={20} height={20} className="h-full w-full object-contain" unoptimized />
    </span>
  );
}
