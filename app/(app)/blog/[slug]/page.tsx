import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { serverGetBlogPost } from "@/lib/api-server";
import { blogPostDate, legacyBlogPost, sanitizeBlogHtml } from "@/lib/blog";
import { ShareButtons } from "@/components/common/ShareButtons";
import { BlogAdminActions } from "@/components/blog/BlogAdminActions";

export const revalidate = 900;
async function findPost(slug: string) { return (await serverGetBlogPost(slug)) ?? legacyBlogPost(slug); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const post = await findPost(slug); if (!post) return {}; return { title: post.title, description: post.description, alternates: { canonical: `/blog/${post.slug}` }, openGraph: { title: post.title, description: post.description, type: "article", publishedTime: blogPostDate(post), modifiedTime: post.updatedAt, siteName: "AnimesIce" } }; }
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const post = await findPost(slug); if (!post) notFound(); const date = blogPostDate(post);
  return <article className="mx-auto max-w-[720px] px-4 py-6"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.description, datePublished: date, dateModified: post.updatedAt, author: { "@type": "Organization", name: "AnimesIce" }, publisher: { "@type": "Organization", name: "AnimesIce", url: SITE_URL }, mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` } }).replace(/</g, "\\u003c") }} /><nav className="mb-4 text-caption text-mist" aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-1"><li><Link href="/" className="hover:text-ice">Início</Link></li><li aria-hidden="true">/</li><li><Link href="/blog" className="hover:text-ice">Blog</Link></li><li aria-hidden="true">/</li><li aria-current="page" className="line-clamp-1 text-ice">{post.title}</li></ol></nav><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-mono text-caption uppercase tracking-wider text-ice">{post.category}</span><BlogAdminActions post={post} detail /></div><h1 className="mt-2 font-display text-display-xl text-snow">{post.title}</h1><time className="mt-2 block font-mono text-caption text-mist" dateTime={date}>{new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</time><div className="prose-body mt-6 space-y-4 text-body text-mist" dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content) }} /><div className="mt-8 border-t border-hairline pt-6"><ShareButtons title={post.title} url={`/blog/${post.slug}`} description={post.description} /></div><div className="mt-6"><Link href="/blog" className="text-body-sm text-ice hover:underline">← Voltar ao blog</Link></div></article>;
}
