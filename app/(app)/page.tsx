import { Suspense } from "react";
import { DeferredPersonalizedRails } from "@/components/common/DeferredPersonalizedRails";
import { HomeBackdrop } from "@/components/common/crystal/HomeBackdrop";
import { IceBeamDivider } from "@/components/common/crystal/IceBeamDivider";
import { CatalogSections, LatestSection, RecentSection, SectionFallback, TrendingHeroSection, TrendingSection } from "@/components/home/HomeSections";

export const revalidate = 60;

export default function HomePage() {
  return <>
    <HomeBackdrop />
    <h1 className="sr-only">Prateleira — Animes no ar, lançamentos e destaques</h1>
    <div className="mx-auto max-w-shelf px-4 pb-4 pt-6">
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
  </>;
}
