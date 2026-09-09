import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { DeferredPersonalizedRails } from "@/components/common/DeferredPersonalizedRails";
import { HomeBackdrop } from "@/components/common/crystal/HomeBackdrop";
import { IceBeamDivider } from "@/components/common/crystal/IceBeamDivider";
import { CatalogSections, LatestSection, RecentSection, SectionFallback, TrendingHeroSection, TrendingSection } from "@/components/home/HomeSections";

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
    <h1 className="sr-only">AnimesIce — Assistir animes online em HD, legendados e dublados</h1>
    <div className="mx-auto max-w-shelf px-4 pb-4 pt-6">
      <Link
        href="/gacha"
        className="mb-4 flex min-h-11 items-center justify-between gap-4 border border-ice/40 bg-ice/10 px-4 py-3 text-snow transition-colors hover:bg-ice/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice"
      >
        <span>
          <span className="mr-2 font-mono text-caption text-ice">NOVO</span>
          <span className="font-display text-body">Gire seu gacha diário e colecione cartas.</span>
        </span>
        <span className="shrink-0 font-mono text-caption text-ice">GIRAR</span>
      </Link>
      <Suspense fallback={<SectionFallback hero />}><TrendingHeroSection /></Suspense>
    </div>
    <IceBeamDivider />
    <div className="mx-auto max-w-shelf px-4 py-4">
      <DeferredPersonalizedRails />
      <Suspense fallback={<SectionFallback />}><CatalogSections /></Suspense>
      <Suspense fallback={<SectionFallback />}><LatestSection /></Suspense>
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
