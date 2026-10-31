import Image from "next/image";
import type { GachaItemKind } from "@/types";

/**
 * Selo de fragmento bônus: 5% dos giros vêm com um fragmento junto (Titanita
 * 50% · Magnetita 30% · Titanita Sombria 10% · Magnetita Sombria 10%).
 * Tipos internos "DRACONICA*" são os mesmos fragmentos exibidos como
 * "Magnetita*" em todo o gacha.
 */
export const SHARD_ICONS: Partial<Record<GachaItemKind, { src: string; label: string }>> = {
  TITANITA: { src: "/gacha/titanita.png", label: "Fragmento de Titanita" },
  TITANITA_SOMBRIA: { src: "/gacha/titanita-sombria.png", label: "Fragmento de Titanita Sombria" },
  DRACONICA: { src: "/gacha/magnetita.png", label: "Fragmento de Magnetita" },
  SOMBRIA_DRACONICA: { src: "/gacha/magnetita-sombria.png", label: "Fragmento de Magnetita Sombria" },
};

/**
 * Ícone pequeno do fragmento. `glow` entra depois do resgate: brilho leve,
 * sempre com animação atrás de prefers-reduced-motion.
 */
export function BonusShardIcon({ kind, glow = false, className = "" }: { kind: GachaItemKind; glow?: boolean; className?: string }) {
  const icon = SHARD_ICONS[kind];
  if (!icon) return null;
  return (
    <span
      title={`${icon.label} · veio junto com esta carta`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/25 bg-ink/70 p-0.5 shadow-[0_0_6px_rgba(0,0,0,0.45)] ${
        glow ? "shard-bonus-glow motion-safe:animate-[shard-bonus-glow_2.4s_ease-in-out_infinite]" : ""
      } ${className}`}
    >
      <Image src={icon.src} alt={icon.label} width={20} height={20} className="h-full w-full object-contain" unoptimized />
    </span>
  );
}
