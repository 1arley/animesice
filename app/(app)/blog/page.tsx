import type { Metadata } from "next";
import { BlogIndexPage } from "@/features/blog/pages";

export const revalidate = 900;
export const metadata: Metadata = { title: "Blog — Notícias, listas e guias de animes", description: "Blog do AnimesIce com notícias, listas recomendadas, guias de temporadas e conteúdos exclusivos sobre o mundo dos animes.", alternates: { canonical: "/blog" }, openGraph: { title: "Blog | AnimesIce", description: "Notícias, listas e guias de animes." } };

export default function BlogPage() { return <BlogIndexPage />; }
