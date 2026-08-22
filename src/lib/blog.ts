import type { BlogPost, Paginated } from "@/types";

type LegacyPost = Pick<BlogPost, "slug" | "title" | "description" | "category" | "publishedAt" | "content">;

const LEGACY: LegacyPost[] = [
  {
    slug: "melhores-animes-2026",
    title: "Melhores animes de 2026 — Lista completa",
    description: "Confira os animes mais bem avaliados de 2026 com sinopses, notas e onde assistir.",
    publishedAt: "2026-08-15T12:00:00.000Z",
    category: "Listas",
    content: `<p>O ano de 2026 está sendo incrível para os fãs de animes. Com lançamentos surpreendentes e continuações aguardadas, tivemos uma temporada cheia de emoções.</p><h2>Top 10 animes do ano</h2><p>Confira nossa seleção dos melhores animes que estrearam em 2026:</p><ol><li><strong>Solo Leveling Temporada 2</strong> — A continuação que superou todas as expectativas</li><li><strong>Dandadan</strong> — Ação e comédia em dose dupla</li><li><strong>Blue Lock Temporada 2</strong> — O futebol nunca foi tão intenso</li><li><strong>Frieren Temporada 2</strong> — A viagem continua encantando</li><li><strong>One Piece</strong> — Sempre entre os melhores</li></ol><h2>Como escolher o que assistir?</h2><p>Use nossa <a href="/buscar">página de busca</a> para filtrar por gênero, ano e avaliação. Você também pode conferir o <a href="/top">top da comunidade</a>.</p>`,
  },
  {
    slug: "guia-temporada-outono-2026",
    title: "Guia da temporada Outono 2026 — O que assistir",
    description: "Todo o lançamento da temporada de outono 2026 com sinopses e horários de exibição.",
    publishedAt: "2026-08-10T12:00:00.000Z",
    category: "Guias",
    content: `<p>A temporada de outono 2026 promete ser uma das melhores dos últimos anos. Com dezenas de títulos novos e continuações, separamos o que você precisa assistir.</p><h2>Destaques da temporada</h2><ul><li><strong>Re:Zero Temporada 4</strong> — Subaru está de volta com mais desafios</li><li><strong>Mushoku Tensei Temporada 3</strong> — A jornada de Rudeus continua</li><li><strong>Jujutsu Kaisen Temporada 3</strong> — Novos confrontos intensos</li></ul><h2>Calendário de exibição</h2><p>Acesse nosso <a href="/calendario">calendário semanal</a> para saber quando cada anime vai ao ar.</p>`,
  },
  {
    slug: "melhores-animes-dublados",
    title: "Melhores animes dublados em português",
    description: "Lista dos melhores animes com dublagem profissional em português do Brasil.",
    publishedAt: "2026-08-05T12:00:00.000Z",
    category: "Listas",
    content: `<p>A dublagem brasileira de animes está cada vez melhor. Com profissionais talentosos e estúdios dedicados, temos acesso a produções com qualidade impressionante.</p><h2>Top animes dublados</h2><ul><li><strong>Dragon Ball Super</strong> — Dublagem icônica e nostálgica</li><li><strong>My Hero Academia</strong> — Excelente elenco principal</li><li><strong>One Punch Man</strong> — Humor muito bem adaptado</li><li><strong>Naruto Shippuden</strong> — Um clássico da dublagem</li><li><strong>Attack on Titan</strong> — Dublagem séria e envolvente</li></ul><h2>Como encontrar animes dublados</h2><p>Use nossa <a href="/buscar?audio=DUBLADO">busca por dublados</a> para encontrar o catálogo disponível em português.</p>`,
  },
  {
    slug: "onde-assistir-animes-2026",
    title: "Onde assistir animes em 2026 — Comparativo completo",
    description: "Comparativo das melhores plataformas para assistir animes no Brasil com preços e catálogo.",
    publishedAt: "2026-07-28T12:00:00.000Z",
    category: "Guias",
    content: `<p>Escolher a melhor plataforma para assistir animes pode ser complicado. Cada uma tem seus pontos fortes e fracos. Fizemos um comparativo para ajudar.</p><h2>Principais plataformas</h2><ul><li><strong>Crunchyroll</strong> — Amplo catálogo, legendas e dublagem em português</li><li><strong>Netflix</strong> — Títulos populares e produções originais</li><li><strong>Amazon Prime Video</strong> — Catálogo crescente e títulos exclusivos</li><li><strong>AnimesIce</strong> — Catálogo gratuito e comunidade ativa</li></ul><h2>O que considerar</h2><p>Compare preço, catálogo, qualidade da dublagem, legendas e disponibilidade offline.</p>`,
  },
  {
    slug: "animes-isekai-melhores",
    title: "Melhores animes isekai — Os 20 mais votados",
    description: "Os 20 melhores animes do gênero isekai votados pela comunidade do AnimesIce.",
    publishedAt: "2026-07-20T12:00:00.000Z",
    category: "Listas",
    content: `<p>O gênero isekai continua sendo um dos mais populares do mundo dos animes. Separamos os mais votados pela nossa comunidade.</p><h2>Top isekais</h2><ol><li><strong>Re:Zero</strong> — O clássico que definiu o gênero</li><li><strong>Mushoku Tensei</strong> — Um RPG vivido como vida real</li><li><strong>KonoSuba</strong> — A paródia perfeita do isekai</li><li><strong>Overlord</strong> — Poder absoluto em outro mundo</li><li><strong>No Game No Life</strong> — Dois gênios em um mundo de jogos</li></ol><h2>Como descobrir mais</h2><p>Filtre por gênero na nossa <a href="/buscar?genres=isekai">página de busca</a>.</p>`,
  },
  {
    slug: "glossario-anime-termos",
    title: "Glossário de termos de anime — O que significa cada coisa",
    description: "Guia completo com os termos usados no mundo dos animes: OP, ED, otaku, tsundere e mais.",
    publishedAt: "2026-07-15T12:00:00.000Z",
    category: "Guias",
    content: `<p>Se você é novo no mundo dos animes, deve ter encontrado muitos termos diferentes. Preparamos um glossário para ajudar.</p><h2>Termos comuns</h2><ul><li><strong>OP</strong> — Opening, a abertura do anime</li><li><strong>ED</strong> — Ending, o encerramento</li><li><strong>OVA</strong> — Original Video Animation</li><li><strong>ONA</strong> — Original Net Animation</li><li><strong>Mangá</strong> — Quadrinhos japoneses</li><li><strong>Light novel</strong> — Romance japonês ilustrado</li></ul><h2>Termos de personalidade</h2><ul><li><strong>Tsundere</strong> — Demonstra frieza, mas esconde afeto</li><li><strong>Yandere</strong> — Amor levado a extremos perigosos</li><li><strong>Kuudere</strong> — Personalidade fria e calculista</li><li><strong>Dandere</strong> — Personalidade tímida e calada</li></ul>`,
  },
];

export const legacyBlogPosts: BlogPost[] = LEGACY.map((post) => ({
  ...post,
  id: `legacy:${post.slug}`,
  published: true,
  createdAt: post.publishedAt ?? "2026-01-01T00:00:00.000Z",
  updatedAt: post.publishedAt ?? "2026-01-01T00:00:00.000Z",
}));

export function normalizeBlogList(value: Paginated<BlogPost> | BlogPost[] | null): BlogPost[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value.data ?? [];
}

/** Usa legado somente quando a API falha ou ainda não recebeu seed. */
export function withLegacyFallback(posts: BlogPost[]): BlogPost[] {
  return posts.length > 0 ? posts : legacyBlogPosts;
}

export function legacyBlogPost(slug: string): BlogPost | null {
  return legacyBlogPosts.find((post) => post.slug === slug) ?? null;
}

export function isLegacyBlogPost(post: BlogPost): boolean {
  return post.id.startsWith("legacy:");
}

export function blogPostDate(post: BlogPost): string {
  return post.publishedAt ?? post.createdAt;
}

/** Defesa em profundidade; a sanitização autoritativa deve continuar no backend. */
export function sanitizeBlogHtml(html: string): string {
  return html
    // Remove tags perigosas completas (com conteúdo)
    .replace(/<\s*(script|iframe|object|embed|form|style|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    // Remove tags perigosas self-closing ou sem fechamento
    .replace(/<\s*(script|iframe|object|embed|form|style|link|meta)\b[^>]*\/?\s*>/gi, "")
    // Remove event handlers e srcdoc
    .replace(/\s(on\w+|srcdoc)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Remove javascript: e data:text/html em href/src
    .replace(/\s(href|src)\s*=\s*(["'])\s*(javascript:|data:text\/html)[\s\S]*?\2/gi, ' $1="#"')
    // Remove <base> tags que poderiam redirecionar recursos
    .replace(/<\s*base\b[^>]*>/gi, "")
    // Remove <meta http-equiv="refresh"> que poderia redirecionar
    .replace(/<\s*meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, "")
    // Remove <svg/onload=...> e payloads via SVG
    .replace(/<svg\b[^>]*\bon\w+\s*=[^>]*>/gi, "<svg>")
    // Remove expression() em CSS inline
    .replace(/expression\s*\(/gi, "expr(");
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[char] ?? char);
}
