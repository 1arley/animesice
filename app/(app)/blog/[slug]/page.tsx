import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  content: string;
}

const POSTS: Record<string, BlogPost> = {
  "melhores-animes-2026": {
    slug: "melhores-animes-2026",
    title: "Melhores animes de 2026 — Lista completa",
    description: "Confira os animes mais bem avaliados de 2026 com sinopses, notas e onde assistir.",
    date: "2026-08-15",
    category: "Listas",
    content: `
      <p>O ano de 2026 está sendo incrível para os fãs de animes. Com lançamentos surpreendentes e continuações aguardadas, tivemos uma temporada cheia de emoções.</p>
      
      <h2>Top 10 animes do ano</h2>
      <p>Confira nossa seleção dos melhores animes que estrearam em 2026:</p>
      <ol>
        <li><strong>Solo Leveling Temporada 2</strong> — A continuação que superou todas as expectativas</li>
        <li><strong>Dandadan</strong> — Abridor de temporada com ação e comédia em dose dupla</li>
        <li><strong>Blue Lock Temporada 2</strong> — O futebol nunca foi tão intenso</li>
        <li><strong>Frieren Temporada 2</strong> — Viagem epoga continua encantando</li>
        <li><strong>One Piece</strong> — Sempre entre os melhores, sempre surpreendendo</li>
      </ol>
      
      <h2>Como escolher o que assistir?</h2>
      <p>Use nossa <a href="/buscar">página de busca</a> para filtrar por gênero, ano e avaliação. Você também pode conferir o <a href="/top">top da comunidade</a> para ver o que está bombando.</p>
    `,
  },
  "guia-temporada-outono-2026": {
    slug: "guia-temporada-outono-2026",
    title: "Guia da temporada Outono 2026 — O que assistir",
    description: "Todo o lançamento da temporada de outono 2026 com sinopses e horários de exibição.",
    date: "2026-08-10",
    category: "Guias",
    content: `
      <p>A temporada de outono 2026 promete ser uma das melhores dos últimos anos. Com dezenas de títulos novos e continuações, decidimos separar o que você precisa assistir.</p>
      
      <h2>Destaques da temporada</h2>
      <p>Confira os animes que estão dominando a temporada:</p>
      <ul>
        <li><strong>Re:Zero Temporada 4</strong> — Subaru está de volta com mais desafios</li>
        <li><strong>Mushoku Tensei Temporada 3</strong> — A jornada de Rudeus continua</li>
        <li><strong>Jujutsu Kaisen Temporada 3</strong> — Arco de Shibuya continua intenso</li>
      </ul>
      
      <h2>Calendário de exibição</h2>
      <p>Acesse nosso <a href="/calendario">calendário semanal</a> para saber quando cada anime vai ao ar.</p>
    `,
  },
  "melhores-animes-dublados": {
    slug: "melhores-animes-dublados",
    title: "Melhores animes dublados em português",
    description: "Lista dos melhores animes com dublagem profissional em português do Brasil.",
    date: "2026-08-05",
    category: "Listas",
    content: `
      <p>A dublagem brasileira de animes está cada vez melhor. Com profissionais talentosos e estúdios dedicados, temos acesso a animes dublados com qualidade impressionante.</p>
      
      <h2>Top animes dublados</h2>
      <p>Estes são os animes que você deve assistir dublados:</p>
      <ul>
        <li><strong>Dragon Ball Super</strong> — Dublagem icônica e nostálgica</li>
        <li><strong>My Hero Academia</strong> — Elenco principal muito bom</li>
        <li><strong>One Punch Man</strong> — Saitama dublado é hilário</li>
        <li><strong>Naruto Shippuden</strong> — Clássico da dublagem</li>
        <li><strong>Attack on Titan</strong> — Dublagem séria e envolvente</li>
      </ul>
      
      <h2>Como encontrar animes dublados</h2>
      <p>Use nossa <a href="/buscar?audio=DUBLADO">busca filtrada por dublado</a> para encontrar todos os animes disponíveis com dublagem em português.</p>
    `,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      siteName: "AnimesIce",
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = POSTS[slug];

  if (!post) {
    return (
      <div className="mx-auto max-w-shelf px-4 py-6">
        <h1 className="shelf-label">Artigo não encontrado</h1>
        <p className="text-body-sm text-mist">
          <Link href="/blog" className="text-ice hover:underline">Voltar ao blog</Link>
        </p>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-shelf px-4 py-6" style={{ maxWidth: 720 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            author: {
              "@type": "Organization",
              name: "AnimesIce",
            },
            publisher: {
              "@type": "Organization",
              name: "AnimesIce",
              url: SITE_URL,
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${SITE_URL}/blog/${post.slug}`,
            },
          }),
        }}
      />

      <nav className="mb-4 text-caption text-mist" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li><a href="/" className="hover:text-ice">Início</a></li>
          <li aria-hidden="true">/</li>
          <li><a href="/blog" className="hover:text-ice">Blog</a></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ice">{post.title}</li>
        </ol>
      </nav>

      <span className="font-mono text-caption uppercase tracking-wider text-ice">
        {post.category}
      </span>

      <h1 className="mt-2 font-display text-display-xl text-snow">
        {post.title}
      </h1>

      <time className="mt-2 block font-mono text-caption text-mist">
        {new Date(post.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
      </time>

      <div
        className="prose-body mt-6 space-y-4 text-body text-mist"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <div className="mt-8 border-t border-hairline pt-6">
        <Link href="/blog" className="text-body-sm text-ice hover:underline">
          ← Voltar ao blog
        </Link>
      </div>
    </article>
  );
}
