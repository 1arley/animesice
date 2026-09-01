/**
 * Ko-fi — apoio opcional ao projeto.
 *
 * Uma fonte de URL + ícone únicos para o header e o footer. No header a
 * presença é propositalmente discreta: ícone só, tom de mist, sem borda —
 * apoio não vira pedido. O footer mantém o botão com destaque.
 */
export const KO_FI_URL = "https://ko-fi.com/iarley";

/** Xícara de café — mesma arte nos dois lugares. */
function KoFiIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 6h7v4.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M10 6.5h1.25A1.75 1.75 0 0 1 13 8.25v.5a1.75 1.75 0 0 1-1.75 1.75H10"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5.5 2.5c0-.5.5-.75.5-1.25M7.75 2.5c0-.5.5-.75.5-1.25"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface KoFiLinkProps {
  /** "header" = ícone discreto; "footer" = botão com destaque. */
  variant?: "header" | "footer";
}

export function KoFiLink({ variant = "footer" }: KoFiLinkProps) {
  if (variant === "header") {
    return (
      <a
        href={KO_FI_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Apoie no Ko-fi"
        title="Apoie no Ko-fi"
        className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-mist opacity-80 transition-[color,opacity] duration-200 hover:text-ice hover:opacity-100"
      >
        <KoFiIcon size={16} />
      </a>
    );
  }

  return (
    <a
      href={KO_FI_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex min-h-11 items-center gap-2 border border-signal/60 bg-signal/10 px-3 py-2.5 font-mono text-caption font-medium uppercase tracking-wider text-signal transition-colors hover:bg-signal hover:text-ink"
    >
      <KoFiIcon size={14} />
      Apoie no Ko-fi
    </a>
  );
}
