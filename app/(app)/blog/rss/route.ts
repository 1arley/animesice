import { blogService, renderBlogRss } from "@/features/blog/server";

export const revalidate = 900;

export async function GET() {
  const rss = renderBlogRss(await blogService.listPublishedPosts());
  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
    },
  });
}
