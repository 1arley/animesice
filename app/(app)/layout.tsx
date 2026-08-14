import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import { MobileTabBar } from "@/components/common/MobileTabBar";
import { CrystalTransition } from "@/components/animesice/CrystalTransition";

/**
 * Chrome da prateleira: Header + SiteNav + skip-link + main + Footer.
 * Decisão única de composição — páginas do grupo ficam só com o conteúdo.
 * MobileTabBar: nav inferior só <sm (o SiteNav cobre desktop/tablet).
 * CrystalTransition: wipe de 0.55s da identidade de motion entre rotas.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <CrystalTransition />
      <a
        href="#body-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ice focus:px-4 focus:py-2 focus:font-mono focus:text-body-sm focus:uppercase focus:text-ink"
      >
        Pular para conteúdo
      </a>
      <Header />
      <SiteNav />
      <main id="body-content" className="pb-16 sm:pb-0">{children}</main>
      <Footer />
      <MobileTabBar />
    </>
  );
}
