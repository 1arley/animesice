"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { isPrivileged } from "@/lib/role";
import { Wordmark } from "@/components/common/Wordmark";

interface FooterLink { href: string; title: string; external?: boolean; }

export function Footer() {
  const { user } = useAuth();
  const isAdmin = isPrivileged(user);

  const navigate: FooterLink[] = [
    { href: "/", title: "Início" },
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
    { href: "https://jikan.moe", title: "Jikan API", external: true },
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
          <a
            href="https://ko-fi.com/iarley"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 border border-signal/60 bg-signal/10 px-3 py-2 font-mono text-caption font-medium uppercase tracking-wider text-signal transition-colors hover:bg-signal hover:text-ink"
          >
            <svg
              width="14"
              height="14"
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
            Apoie no Ko-fi
          </a>
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
