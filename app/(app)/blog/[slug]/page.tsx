import type { Metadata } from "next";
import { BlogPostContent, getBlogPostMetadata } from "@/features/blog/pages";

export const revalidate = 900;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return getBlogPostMetadata(slug);
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  return <BlogPostContent slug={slug} />;
}
