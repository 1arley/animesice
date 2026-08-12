import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Minha biblioteca",
  description: "Sua biblioteca de animes — listas, favoritos e histórico.",
  alternates: { canonical: "/biblioteca" },
};

export default function LibraryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
