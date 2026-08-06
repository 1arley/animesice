import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";

/**
 * Chrome da prateleira: Header + SiteNav + main (skip-anchor) + Footer.
 * Decisão única de composição — páginas do grupo ficam só com o conteúdo.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <SiteNav />
      <main id="body-content">{children}</main>
      <Footer />
    </>
  );
}
