import Link from "next/link";

/**
 * Wordmark autoral AnimesIce.
 * O "·" (middot) em ice separa "Animes" de "Ice" e carrega a marca:
 * a única nota cyan-aqua, a mesma cor do accent, fazendo o nome *ser* a marca
 * em vez de pedir um logo externo. Sem asset crawado.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="AnimesIce — home"
      className={`group inline-flex items-baseline gap-[0.15em] font-display font-semibold tracking-tight text-ink ${className}`}
    >
      <span className="text-ink">Animes</span>
      <span className="text-ice transition-opacity group-hover:opacity-70">
        &#183;
      </span>
      <span className="text-ice">Ice</span>
    </Link>
  );
}
