const sponsorUrl = process.env.NEXT_PUBLIC_MONETAG_SPONSOR_LINK;

export function SponsoredSignal() {
  if (!sponsorUrl) return null;

  let href: string;
  try {
    const url = new URL(sponsorUrl);
    if (url.protocol !== "https:") return null;
    href = url.toString();
  } catch {
    return null;
  }

  return (
    <aside
      aria-label="Publicidade"
      className="relative my-8 overflow-hidden border border-ice/25 bg-panel/70 px-5 py-5 sm:flex sm:items-center sm:gap-6 sm:px-6"
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-ice shadow-[0_0_18px_rgba(56,232,218,0.45)]"
      />
      <div className="min-w-0 flex-1 pl-2">
        <p className="font-mono text-caption text-ice">Publicidade</p>
        <h2 className="mt-1 font-display text-display-sm text-snow">
          Um intervalo mantém o sinal no ar
        </h2>
        <p className="mt-2 max-w-2xl text-body-sm leading-relaxed text-mist">
          Ao continuar, você abrirá uma oferta do nosso parceiro em uma nova
          aba.
        </p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="btn-ice mt-4 inline-flex min-h-11 shrink-0 items-center justify-center sm:mt-0"
      >
        Ver oferta do patrocinador
      </a>
    </aside>
  );
}
