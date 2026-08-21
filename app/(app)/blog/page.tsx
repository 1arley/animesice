import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog — Notícias, listas e guias de animes",
  description: "Blog do AnimesIce com notícias, listas recomendadas, guias de temporadas e conteúdos exclusivos sobre o mundo dos animes.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog | AnimesIce",
    description: "Notícias, listas e guias de animes.",
  },
};

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

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <nav className="mb-4 text-caption text-mist" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1">
          <li><a href="/" className="hover:text-ice">Início</a></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ice">Blog</li>
        </ol>
      </nav>

      <h1 className="shelf-label">
        Blog{" "}
        <span className="shelf-label-data">{POSTS.length} artigos</span>
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group border border-hairline bg-panel p-4 transition-all hover:border-ice"
          >
            <span className="font-mono text-caption uppercase tracking-wider text-ice">
              {post.category}
            </span>
            <h2 className="mt-2 font-display text-body font-semibold text-snow transition-colors group-hover:text-ice">
              {post.title}
            </h2>
            <p className="mt-2 text-body-sm text-mist line-clamp-2">
              {post.description}
            </p>
            <time className="mt-3 block font-mono text-caption text-mist">
              {new Date(post.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </time>
          </Link>
        ))}
      </div>
    </div>
  );
}
