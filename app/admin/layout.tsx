"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import { AdminGate } from "@/components/common/AdminGate";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/catalogo", label: "Catálogo" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/moderacao", label: "Moderação" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/feedbacks", label: "Feedbacks" },
  { href: "/admin/config", label: "Configurações" },
];

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminGate>
      <Header />
      <SiteNav />
      <main className="mx-auto max-w-shelf px-4 py-6">
        <AdminNav />
        {children}
      </main>
      <Footer />
    </AdminGate>
  );
}

function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-hairline pb-3">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 font-mono text-caption uppercase tracking-wider transition-colors ${
              active
                ? "border border-ice text-ice"
                : "border border-hairline text-mist hover:border-ice/40 hover:text-ice"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
