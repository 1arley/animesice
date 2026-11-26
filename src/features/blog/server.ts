import "server-only";

import { serverFetchJson } from "@/lib/api-server";
import type { Paginated } from "@/types";
import { legacyBlogPost, normalizeBlogList, withLegacyFallback } from "./utils";
import type { BlogPost } from "./types";

class BlogService {
  async listPublishedPosts(page = 1, limit = 100): Promise<BlogPost[]> {
    const result = await serverFetchJson<Paginated<BlogPost>>(
      `/blog-posts?published=true&page=${page}&limit=${limit}`,
      { cache: "force-cache", next: { revalidate: 900, tags: ["blog-posts"] } },
    );
    return withLegacyFallback(normalizeBlogList(result));
  }

  async getPost(slug: string): Promise<BlogPost | null> {
    const post = await serverFetchJson<BlogPost>(
      `/blog-posts/slug/${encodeURIComponent(slug)}`,
      { cache: "force-cache", next: { revalidate: 900, tags: ["blog-posts", `blog-post:${slug}`] } },
    );
    return post ?? legacyBlogPost(slug);
  }
}

export const blogService = new BlogService();
export { renderBlogRss } from "./rss";
