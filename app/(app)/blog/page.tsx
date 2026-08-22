import Link from "next/link";
import type { Metadata } from "next";
import { serverListBlogPosts } from "@/lib/api-server";
import { blogPostDate, normalizeBlogList, withLegacyFallback } from "@/lib/blog";
import { BlogAdminActions } from "@/components/blog/BlogAdminActions";

export const revalidate = 900;
export const metadata: Metadata = { title: "Blog — Notícias, listas e guias de animes", description: "Blog do AnimesIce com notícias, listas recomendadas, guias de temporadas e conteúdos exclusivos sobre o mundo dos animes.", alternates: { canonical: "/blog" }, openGraph: { title: "Blog | AnimesIce", description: "Notícias, listas e guias de animes." } };

export default async function BlogPage() {
  const posts = withLegacyFallback(normalizeBlogList(await serverListBlogPosts()));
  return <div className="mx-auto max-w-shelf px-4 py-6"><nav className="mb-4 text-caption text-mist" aria-label="Breadcrumb"><ol className="flex items-center gap-1"><li><Link href="/" className="hover:text-ice">Início</Link></li><li aria-hidden="true">/</li><li aria-current="page" className="text-ice">Blog</li></ol></nav><h1 className="shelf-label">Blog <span className="shelf-label-data">{posts.length} {posts.length === 1 ? "artigo" : "artigos"}</span></h1><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <article key={post.slug} className="group relative flex min-h-56 flex-col border border-hairline bg-panel p-4 pb-16 transition-colors hover:border-ice focus-within:border-ice"><Link href={`/blog/${post.slug}`} className="absolute inset-0" aria-label={`Ler ${post.title}`} /><span className="pointer-events-none relative font-mono text-caption uppercase tracking-wider text-ice">{post.category}</span><h2 className="pointer-events-none relative mt-2 font-display text-body font-semibold text-snow transition-colors group-hover:text-ice">{post.title}</h2><p className="pointer-events-none relative mt-2 line-clamp-2 text-body-sm text-mist">{post.description}</p><time className="pointer-events-none relative mt-auto pt-3 font-mono text-caption text-mist" dateTime={blogPostDate(post)}>{new Date(blogPostDate(post)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</time><BlogAdminActions post={post} /></article>)}</div></div>;
}
