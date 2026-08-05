import Link from "next/link";

const cols: { title: string; links: { href: string; title: string; external?: boolean }[] }[] = [
  {
    title: "Navegar",
    links: [
      { href: "/", title: "Início" },
      { href: "/admin", title: "Painel admin" },
    ],
  },
  {
    title: "Conta",
    links: [
      { href: "/login", title: "Entrar" },
      { href: "/register", title: "Registrar" },
    ],
  },
  {
    title: "Referência",
    links: [
      { href: "https://myanimelist.net", title: "MyAnimeList", external: true },
      { href: "https://jikan.moe", title: "Jikan API", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-hairline bg-ink">
      <div className="mx-auto grid max-w-shelf gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        {/* Marca + disclamer — ocupa a primeira coluna. */}
        <div className="sm:col-span-2 md:col-span-1">
          <p className="font-display text-lg font-semibold text-ink">
            Animes<span className="text-ice">&#183;</span>
            <span className="text-ice">Ice</span>
          </p>
          <p className="mt-3 max-w-xs text-caption text-mist">
            Prateleira de streaming. Não hospedamos vídeo — todo conteúdo é
            provido de terceiros não afiliados.
          </p>
        </div>

        {cols.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 font-sans text-caption font-semibold uppercase tracking-wider text-mist">
              {col.title}
            </h2>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.href + link.title}>
                  <Link
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="text-body-sm text-mist transition-colors hover:text-ice"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-shelf flex-col gap-1 px-4 py-4 text-caption text-mist sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AnimesIce</p>
          <p>
            <Link href="#" className="transition-colors hover:text-ice">Privacidade</Link>
            <span className="mx-2 text-hairline">·</span>
            <Link href="#" className="transition-colors hover:text-ice">DMCA</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
