import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/AdSlot";
import { DeferredPersonalizedRails } from "@/components/common/DeferredPersonalizedRails";
import { HomeBackdrop } from "@/components/common/crystal/HomeBackdrop";
import { CatalogSections, LatestSection, RecentSection, SectionFallback, TrendingHeroSection, TrendingSection } from "@/components/home/HomeSections";
import { isBloodWarActive } from "@/lib/event-theme";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "AnimesIce — Assistir animes online em HD, legendados e dublados",
  description: "Assistir animes online em HD, legendados e dublados. Catálogo completo com milhares de títulos, sinopses, avaliação da comunidade e episódios atualizados diariamente.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "AnimesIce — Assistir animes online em HD, legendados e dublados",
    description: "Assistir animes online em HD, legendados e dublados. Catálogo completo com milhares de títulos.",
  },
};

export default function HomePage() {
  return <>
    <HomeBackdrop />
    <div className="mx-auto max-w-shelf px-4 pb-6 pt-6 sm:pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-caption uppercase tracking-widest text-ice">Hoje no AnimesIce</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-snow sm:text-4xl">Sua próxima história começa aqui.</h1>
          <p className="mt-2 max-w-lg text-body-sm text-mist">Dê o play em um novo favorito. Animes legendados e dublados, do seu jeito.</p>
        </div>
        <Link href="/buscar" className="inline-flex min-h-11 items-center gap-3 font-sans text-body-sm text-snow transition-colors hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ice">
          Explorar catálogo <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <Suspense fallback={<SectionFallback hero />}><TrendingHeroSection /></Suspense>
      <nav aria-label="Descobrir animes" className="mt-4 flex flex-wrap items-center gap-2 border-b border-hairline pb-6">
        <span className="mr-3 w-full py-1 font-mono text-caption uppercase tracking-wider text-mist sm:w-auto">Por onde começar?</span>
        {[
          { href: "/lancamentos", label: "Novos episódios" },
          { href: "/top", label: "Mais populares" },
          { href: "/buscar?audio=DUBLADO", label: "Dublados" },
          { href: "/calendario", label: "Calendário" },
          { href: "/aleatorio", label: "Surpreenda-me" },
        ].map(({ href, label }) => (
          <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-sm border border-hairline bg-panel/60 px-4 text-body-sm text-snow transition-colors hover:border-ice/50 hover:bg-ice/5 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice">
            {label}
          </Link>
        ))}
      </nav>
    </div>
    <div className="mx-auto max-w-shelf px-4 pb-4">
      <DeferredPersonalizedRails />
      <Suspense fallback={<SectionFallback />}><LatestSection /></Suspense>
      <div className="mb-10 grid gap-3 md:grid-cols-2">
        {isBloodWarActive() && (
          <Link
            href="/buscar?q=bleach"
            className="flex min-h-11 items-center justify-between gap-4 border-l-2 border-blood/60 bg-panel/60 px-4 py-4 text-snow transition-colors hover:bg-blood/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blood"
          >
            <span>
              <span className="block font-mono text-caption font-medium uppercase tracking-wider text-blood">Guerra Sangrenta</span>
              <span className="mt-1 block text-body-sm">Entre no universo de Bleach.</span>
            </span>
            <span className="shrink-0 font-mono text-caption text-blood">VER AGORA</span>
          </Link>
        )}
        <Link
          href="/gacha"
          className="flex min-h-11 items-center justify-between gap-4 border-l-2 border-ice/60 bg-panel/60 px-4 py-4 text-snow transition-colors hover:bg-ice/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
        >
          <span>
            <span className="block font-mono text-caption uppercase tracking-wider text-ice">Sua coleção começa aqui</span>
            <span className="mt-1 block text-body-sm">Gire seu gacha diário e colecione cartas.</span>
          </span>
          <span className="shrink-0 font-mono text-caption text-ice">GIRAR</span>
        </Link>
      </div>
      <Suspense fallback={<SectionFallback />}><CatalogSections /></Suspense>
      {/* Publicidade entre blocos de conteúdo — nunca no topo, para não
          empurrar o catálogo para fora da primeira dobra. */}
      <AdSlot className="mb-8" />
      <Suspense fallback={<SectionFallback />}><TrendingSection /></Suspense>
      <Suspense fallback={<SectionFallback />}><RecentSection /></Suspense>
    </div>
    <noscript>
      <div className="mx-auto max-w-shelf px-4 py-8 text-center">
        <p className="mx-auto max-w-xl text-body text-mist">
          AnimesIce é o melhor lugar para assistir animes online em HD, legendados e dublados.
          Explore nosso catálogo completo com milhares de títulos, sinopses detalhadas e avaliações da comunidade.
        </p>
      </div>
    </noscript>
  </>;
}
