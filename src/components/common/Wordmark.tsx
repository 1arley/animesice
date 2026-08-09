import Link from "next/link";

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
        className="h-[1.15em] w-[1.15em] shrink-0 rounded-[4px] ring-1 ring-ice/25 transition-transform duration-300 group-hover:rotate-90"
      />
      <span>Animes</span>
      <span className="text-ice" aria-hidden="true">
        &#183;
      </span>
      <span className="text-ice">Ice</span>
    </Link>
  );
}
