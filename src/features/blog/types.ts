/** Blog content is sanitized before rendering. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostInput {
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
  published: boolean;
  publishedAt: string | null;
}
