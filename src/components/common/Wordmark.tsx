import Link from "next/link";
import { GradientText } from "@/components/core/GradientText";

/**
 * Wordmark autoral AnimesIce.
 * O cristal de gelo do mascote (mesma arte do favicon em /images) é a marca;
 * "Animes" em snow (branco frio) para não sumir no fundo — antes usava ink,
 * que desaparecia.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="AnimesIce — home"
      className={`group inline-flex items-center gap-2 font-display font-bold tracking-tight text-snow ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/animesice-mascot.svg"
        alt=""
        aria-hidden="true"
        className="h-[1.15em] w-[1.15em] shrink-0 rounded-[4px] ring-1 ring-ice/25 transition-[transform,box-shadow,filter] duration-300 group-hover:scale-110 group-hover:ring-ice/70 group-hover:shadow-[0_0_14px_-2px_rgba(69,240,224,0.55)]"
      />
      <span>Animes</span>
      <span className="text-ice" aria-hidden="true">
        &#183;
      </span>
      {/* "Ice" com o gradiente da marca varrendo devagar — o sinal no logo. */}
      <GradientText className="text-[1em]">Ice</GradientText>
    </Link>
  );
}
