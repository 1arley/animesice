import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { ShareButtons } from "@/components/common/ShareButtons";

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
  "onde-assistir-animes-2026": {
    slug: "onde-assistir-animes-2026",
    title: "Onde assistir animes em 2026 — Comparativo completo",
    description: "Comparativo das melhores plataformas para assistir animes no Brasil com preços e catálogo.",
    date: "2026-07-28",
    category: "Guias",
    content: `
      <p>Escolher a melhor plataforma para assistir animes pode ser complicado. Cada uma tem seus pontos fortes e fracos. Fizemos um comparativo completo para te ajudar.</p>
      
      <h2>Principais plataformas</h2>
      <ul>
        <li><strong>Crunchyroll</strong> — O maior catálogo de animes, com legendas e dublagem em português. Preço a partir de R$ 24,90/mês.</li>
        <li><strong>Netflix</strong> — Catálogo seleto com títulos populares e produções originais. Disponível no plano padrão.</li>
        <li><strong>Amazon Prime Video</strong> — Crescendo no catálogo de animes com títulos exclusivos.</li>
        <li><strong>AnimesIce</strong> — Gratuito, com catálogo completo e comunidade ativa.</li>
      </ul>
      
      <h2>O que considerar</h2>
      <p>Ao escolher uma plataforma, considere: preço, catálogo disponível, qualidade de dublagem, legendas e disponibilidade offline.</p>
      
      <h2>Nossa recomendação</h2>
      <p>Para quem quer começar, o <a href="/buscar">AnimesIce</a> é uma ótima opção gratuita. Para quem quer o catálogo mais completo, o Crunchyroll é imbatível.</p>
    `,
  },
  "animes-isekai-melhores": {
    slug: "animes-isekai-melhores",
    title: "Melhores animes isekai — Os 20 mais votados",
    description: "Os 20 melhores animes do gênero isekai votados pela comunidade do AnimesIce.",
    date: "2026-07-20",
    category: "Listas",
    content: `
      <p>O gênero isekai continua sendo um dos mais populares do mundo dos animes. Separ os 20 mais votados pela nossa comunidade.</p>
      
      <h2>Top 20 isekais</h2>
      <ol>
        <li><strong>Re:Zero</strong> — O clássico que definiu o gênero</li>
        <li><strong>Mushoku Tensei</strong> — Rpg vivido como uma vida real</li>
        <li><strong>KonoSuba</strong> — A paródia perfeita do isekai</li>
        <li><strong>Overlord</strong> — O vilão mais poderoso do outro mundo</li>
        <li><strong>No Game No Life</strong> — Dois gênios em um mundo de jogos</li>
      </ol>
      
      <h2>Como descobrir mais</h2>
      <p>Filtre por gênero na nossa <a href="/buscar?genres=isekai">página de busca</a> para descobrir mais animes isekai.</p>
    `,
  },
  "glossario-anime-termos": {
    slug: "glossario-anime-termos",
    title: "Glossário de termos de anime — O que significa cada coisa",
    description: "Guia completo com todos os termos usados no mundo dos animes: OP, ED, otaku, tsundere e mais.",
    date: "2026-07-15",
    category: "Guias",
    content: `
      <p>Se você é novo no mundo dos animes, deve ter se deparado com muitos termos estranhos. Preparamos um glossário completo para te ajudar.</p>
      
      <h2>Termos comuns</h2>
      <ul>
        <li><strong>OP</strong> — Opening, a abertura do anime com a música tema</li>
        <li><strong>ED</strong> — Ending, o encerramento do anime</li>
        <li><strong>OVA</strong> — Original Video Animation, lançado direto em vídeo</li>
        <li><strong>ONA</strong> — Original Net Animation, lançado na internet</li>
        <li><strong>Manga</strong> — Quadrinhos japoneses</li>
        <li><strong>Light Novel</strong> — Romances japoneses ilustrados</li>
      </ul>
      
      <h2>Termos de personalidade</h2>
      <ul>
        <li><strong>Tsundere</strong> — Finge frieza mas é apaixonada por baixo</li>
        <li><strong>Yandere</strong> — Apaixonada a ponto de ser perigosa</li>
        <li><strong>Kuudere</strong> — Fria e calculista, mas com sentimentos</li>
        <li><strong>Dandere</strong> — Tímida e calada</li>
      </ul>
      
      <h2>Termos da comunidade</h2>
      <ul>
        <li><strong>Otaku</strong> — Pessoa obcecada por animes/mangás</li>
        <li><strong>Weeb</strong> — Estrangeiro fã de cultura japonesa</li>
        <li><strong>Simp</strong> — Pessoa que faz de tudo por um personagem</li>
      </ul>
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
        <ShareButtons
          title={post.title}
          url={`/blog/${post.slug}`}
          description={post.description}
        />
      </div>

      <div className="mt-6">
        <Link href="/blog" className="text-body-sm text-ice hover:underline">
          ← Voltar ao blog
        </Link>
      </div>
    </article>
  );
}
