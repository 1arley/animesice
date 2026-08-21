import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
}

const POSTS: BlogPost[] = [
  {
    slug: "melhores-animes-2026",
    title: "Melhores animes de 2026 — Lista completa",
    description: "Confira os animes mais bem avaliados de 2026 com sinopses, notas e onde assistir.",
    date: "2026-08-15",
    category: "Listas",
  },
  {
    slug: "guia-temporada-outono-2026",
    title: "Guia da temporada Outono 2026 — O que assistir",
    description: "Todo o lançamento da temporada de outono 2026 com sinopses e horários de exibição.",
    date: "2026-08-10",
    category: "Guias",
  },
  {
    slug: "melhores-animes-dublados",
    title: "Melhores animes dublados em português",
    description: "Lista dos melhores animes com dublagem profissional em português do Brasil.",
    date: "2026-08-05",
    category: "Listas",
  },
];

export async function GET() {
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AnimesIce Blog</title>
    <description>Notícias, listas e guias de animes</description>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/blog/rss" rel="self" type="application/rss+xml"/>
    <language>pt-br</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${POSTS.map((post) => `
    <item>
      <title>${post.title}</title>
      <description>${post.description}</description>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <category>${post.category}</category>
    </item>`).join("")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
