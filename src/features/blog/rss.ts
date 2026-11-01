import "server-only";

import { SITE_URL } from "@/lib/site";
import { blogPostDate } from "@/features/blog";
import type { BlogPost } from "./types";

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[char] ?? char);
}

export function renderBlogRss(posts: BlogPost[]): string {
  const latest = posts.reduce(
    (value, post) => Math.max(value, new Date(blogPostDate(post)).getTime()),
    Date.now(),
  );
  const items = posts.map((post) => `
<item><title>${escapeXml(post.title)}</title><description>${escapeXml(post.description)}</description><link>${SITE_URL}/blog/${encodeURIComponent(post.slug)}</link><guid isPermaLink="true">${SITE_URL}/blog/${encodeURIComponent(post.slug)}</guid><pubDate>${new Date(blogPostDate(post)).toUTCString()}</pubDate><category>${escapeXml(post.category)}</category></item>`).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>AnimesIce Blog</title><description>Notícias, listas e guias de animes</description>
<link>${SITE_URL}/blog</link><atom:link href="${SITE_URL}/blog/rss" rel="self" type="application/rss+xml"/>
<language>pt-br</language><lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
${items}
</channel></rss>`;
}
