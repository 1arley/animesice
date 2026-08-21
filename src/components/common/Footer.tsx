"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { isPrivileged } from "@/lib/role";
import { Wordmark } from "@/components/common/Wordmark";
import { KoFiLink } from "@/components/common/KoFiLink";

interface FooterLink { href: string; title: string; external?: boolean; }

export function Footer() {
  const { user } = useAuth();
  const isAdmin = isPrivileged(user);

  const navigate: FooterLink[] = [
    { href: "/", title: "Início" },
    { href: "/top", title: "Top Animes" },
    { href: "/lancamentos", title: "Lançamentos" },
    { href: "/calendario", title: "Calendário" },
    { href: "/generos", title: "Gêneros" },
    { href: "/buscar", title: "Buscar" },
    { href: "/blog", title: "Blog" },
    ...(isAdmin ? [{ href: "/admin", title: "Painel admin" }] : []),
  ];
  const conta: FooterLink[] = user
    ? [{ href: "/settings", title: "Configurações" }]
    : [
        { href: "/login", title: "Entrar" },
        { href: "/register", title: "Registrar" },
      ];
  const referencia: FooterLink[] = [
    { href: "https://myanimelist.net", title: "MyAnimeList", external: true },
  ];

  return (
    <footer className="mt-12 border-t border-hairline bg-ink">
      <div className="mx-auto grid max-w-shelf gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <Wordmark className="text-lg" />
          <p className="mt-3 max-w-xs text-caption text-mist">
            Prateleira de streaming. Não hospedamos vídeo — todo conteúdo é
            provido de terceiros não afiliados.
          </p>
          <KoFiLink variant="footer" />
        </div>

        <FooterCol title="Navegar" links={navigate} />
        <FooterCol title="Conta" links={conta} />
        <FooterCol title="Referência" links={referencia} />
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-shelf flex-col gap-1 px-4 py-4 text-caption text-mist sm:flex-row sm:items-center sm:justify-between">
          <p suppressHydrationWarning>© {new Date().getFullYear()} AnimesIce</p>
          <p>
            <Link href="/privacidade" className="transition-colors hover:text-ice">Privacidade</Link>
            <span className="mx-2 text-hairline">·</span>
            <Link href="/dmca" className="transition-colors hover:text-ice">DMCA</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 font-mono text-caption font-semibold uppercase tracking-wider text-mist">
        {title}
      </h2>
      <ul className="space-y-2">
        {links.map((link) => (
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
  );
}
