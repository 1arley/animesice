"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SectionSidebar, type SidebarNavGroup } from "@/components/common/SectionSidebar";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import { AdminGate } from "@/components/common/AdminGate";
import { useAuth } from "@/lib/auth-context";

type AdminNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  superadminOnly?: boolean;
};

type AdminNavGroup = { label: string; items: readonly AdminNavItem[] };

const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  { label: "Visão geral", items: [{ href: "/admin", label: "Dashboard", exact: true }] },
  {
    label: "Conteúdo",
    items: [
      { href: "/admin/catalogo", label: "Catálogo" },
      { href: "/admin/obras-externas", label: "Obra externa" },
      { href: "/admin/generos", label: "Gêneros" },
      { href: "/admin/posts", label: "Posts" },
      { href: "/admin/blog", label: "Blog" },
    ],
  },
  { label: "Gacha", items: [{ href: "/admin/gacha", label: "Gacha" }] },
  {
    label: "Comunidade",
    items: [
      { href: "/admin/usuarios", label: "Usuários" },
      { href: "/admin/moderacao", label: "Moderação" },
      { href: "/admin/pedidos", label: "Pedidos" },
      { href: "/admin/feedbacks", label: "Feedbacks" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/watchtower", label: "Watchtower", superadminOnly: true },
      { href: "/admin/auditoria", label: "Auditoria", superadminOnly: true },
      { href: "/admin/config", label: "Config" },
    ],
  },
  { label: "Site", items: [{ href: "/", label: "Voltar ao site", exact: true }] },
];

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminGate>
      <Header />
      <div className="hidden md:block">
        <SiteNav />
      </div>
      <AdminShell>{children}</AdminShell>
      <Footer />
    </AdminGate>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isSuperadmin = user?.role === "SUPERADMIN";

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  return (
    <div className="mx-auto max-w-shelf px-4 py-4 md:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <AdminSidebar pathname={pathname} mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen} isSuperadmin={isSuperadmin} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function AdminSidebar({ pathname, mobileNavOpen, setMobileNavOpen, isSuperadmin }: { pathname: string; mobileNavOpen: boolean; setMobileNavOpen: (v: boolean) => void; isSuperadmin: boolean }) {
  const groups: SidebarNavGroup[] = ADMIN_NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => !item.superadminOnly || isSuperadmin)
      .map(({ superadminOnly, ...item }) => ({
        ...item,
        after: superadminOnly ? (
          <span className="ml-auto flex items-center gap-1">
            <span className="badge-dot bg-signal" aria-hidden="true" />
            <span className="sr-only">Acesso superadmin</span>
          </span>
        ) : undefined,
      })),
  }));
  const items = groups.flatMap(({ items: groupItems }) => groupItems);
  const activeLabel = items
    .filter(({ href, exact }) =>
      exact
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`),
    )
    .sort((left, right) => right.href.length - left.href.length)[0]?.label;

  return (
    <>
      <button type="button" className="admin-tab sticky top-2 z-30 flex w-full items-center justify-between gap-2 bg-ink/95 backdrop-blur md:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-expanded={mobileNavOpen} aria-controls="admin-navigation">
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileNavOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
          Menu Admin
        </span>
        <span className="max-w-40 truncate text-ice">{activeLabel ?? "Admin"}</span>
      </button>

      {mobileNavOpen && <button type="button" className="fixed inset-0 z-40 bg-black/70 md:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Fechar menu administrativo" />}

      <aside id="admin-navigation" className={`${mobileNavOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-[min(86vw,20rem)] overflow-y-auto border-r border-hairline bg-ink p-4 transition-transform duration-200 md:sticky md:top-4 md:bottom-auto md:z-auto md:w-56 md:flex-none md:translate-x-0 md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto md:border-0 md:bg-transparent md:p-0 md:transition-none`}>
        <SectionSidebar
          title="Admin"
          ariaLabel="Áreas administrativas"
          groups={groups}
          activePath={pathname}
          onNavigate={() => setMobileNavOpen(false)}
        />
      </aside>
    </>
  );
}
