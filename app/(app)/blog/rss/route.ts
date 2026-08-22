import { SITE_URL } from "@/lib/site";
import { serverListBlogPosts } from "@/lib/api-server";
import { blogPostDate, escapeXml, normalizeBlogList, withLegacyFallback } from "@/lib/blog";

export const revalidate = 900;

export async function GET() {
  const posts = withLegacyFallback(normalizeBlogList(await serverListBlogPosts()));
  const latest = posts.reduce((value, post) => Math.max(value, new Date(blogPostDate(post)).getTime()), Date.now());
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>AnimesIce Blog</title><description>Notícias, listas e guias de animes</description>
<link>${SITE_URL}/blog</link><atom:link href="${SITE_URL}/blog/rss" rel="self" type="application/rss+xml"/>
<language>pt-br</language><lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
${posts.map((post) => `<item><title>${escapeXml(post.title)}</title><description>${escapeXml(post.description)}</description><link>${SITE_URL}/blog/${encodeURIComponent(post.slug)}</link><guid isPermaLink="true">${SITE_URL}/blog/${encodeURIComponent(post.slug)}</guid><pubDate>${new Date(blogPostDate(post)).toUTCString()}</pubDate><category>${escapeXml(post.category)}</category></item>`).join("")}
</channel></rss>`;
  return new Response(rss, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400" } });
}
