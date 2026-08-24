import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site";
import { escapeJsonLd } from "@/lib/url";

export const metadata: Metadata = {
  title: "Sobre o AnimesIce",
  description:
    "Conheça o AnimesIce, sua proposta editorial, as fontes das informações do catálogo e os canais de contato.",
  alternates: { canonical: "/sobre" },
};

export default function SobrePage() {
  return (
    <article className="mx-auto max-w-[760px] px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: escapeJsonLd({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "Sobre o AnimesIce",
            url: `${SITE_URL}/sobre`,
            mainEntity: {
              "@type": "Organization",
              name: "AnimesIce",
              url: SITE_URL,
              logo: `${SITE_URL}/images/logo.png`,
            },
          }),
        }}
      />

      <nav className="mb-5 text-caption text-mist" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li><Link href="/" className="hover:text-ice">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ice">Sobre</li>
        </ol>
      </nav>

      <h1 className="font-display text-display-xl text-snow">Sobre o AnimesIce</h1>
      <div className="prose-body mt-6 space-y-6 text-body text-mist">
        <section>
          <h2 className="font-display text-display-lg text-snow">O que fazemos</h2>
          <p className="mt-2">
            O AnimesIce organiza um catálogo em português para ajudar fãs a
            descobrir títulos, acompanhar lançamentos, consultar temporadas,
            dublagens e avaliações da comunidade.
          </p>
        </section>

        <section>
          <h2 className="font-display text-display-lg text-snow">Como tratamos as informações</h2>
          <p className="mt-2">
            Dados factuais, como estúdio, ano, formato e gêneros, podem usar
            bases públicas de referência. Textos identificados como editoriais,
            guias e recomendações são preparados para o público brasileiro e
            podem ser corrigidos quando uma informação muda.
          </p>
        </section>

        <section>
          <h2 className="font-display text-display-lg text-snow">Transparência</h2>
          <p className="mt-2">
            O AnimesIce não hospeda os vídeos exibidos pelo player. As fontes de
            reprodução são fornecidas por terceiros não afiliados. Solicitações
            relacionadas a direitos autorais podem ser enviadas pelo nosso canal
            de <Link href="/dmca" className="text-ice hover:underline">DMCA e contato</Link>.
          </p>
        </section>

        <section>
          <h2 className="font-display text-display-lg text-snow">Fale com a equipe</h2>
          <p className="mt-2">
            Encontrou informação incorreta ou quer sugerir um título? Use a
            página de <Link href="/comunidade/sugestoes" className="text-ice hover:underline">sugestões</Link>.
          </p>
        </section>
      </div>
    </article>
  );
}
