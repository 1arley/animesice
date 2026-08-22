"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import { AdminGate } from "@/components/common/AdminGate";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  superadminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", exact: true },
  { href: "/admin/catalogo", label: "Catálogo", icon: "M4 6a2 2 0 012-2h2v12H6a2 2 0 01-2-2V6zM10 4h4v12h-4zM16 4h2a2 2 0 012 2v8a2 2 0 01-2 2h-2V4z" },
  { href: "/admin/generos", label: "Gêneros", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
  { href: "/admin/usuarios", label: "Usuários", icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a3 3 0 10-3-3 3 3 0 003 3z" },
  { href: "/admin/moderacao", label: "Moderação", icon: "M9 12l2 2 4-4m5.618 4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.016L2 12l1.382 6.04A11.955 11.955 0 0012 21.056a11.955 11.955 0 008.618-3.016L22 12l-1.382-5.984z" },
  { href: "/admin/posts", label: "Posts", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/admin/blog", label: "Blog", icon: "M4 5.5A2.5 2.5 0 016.5 3H12v16H6.5A2.5 2.5 0 004 21.5v-16zM20 5.5A2.5 2.5 0 0017.5 3H12v16h5.5a2.5 2.5 0 012.5 2.5v-16z" },
  { href: "/admin/pedidos", label: "Pedidos", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M7 16h.01" },
  { href: "/admin/feedbacks", label: "Feedbacks", icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" },
  { href: "/admin/watchtower", label: "Watchtower", icon: "M9 12l2 2 4-4m5.618 4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.016L2 12l1.382 6.04A11.955 11.955 0 0012 21.056a11.955 11.955 0 008.618-3.016L22 12l-1.382-5.984z", superadminOnly: true },
  { href: "/admin/auditoria", label: "Auditoria", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", superadminOnly: true },
  { href: "/admin/config", label: "Config", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 003.226.729 1.724 1.724 0 012.437 2.437 1.724 1.724 0 00.729 3.226c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-.729 3.226 1.724 1.724 0 01-2.437 2.437 1.724 1.724 0 00-3.226.729c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-3.226-.729 1.724 1.724 0 01-2.437-2.437 1.724 1.724 0 00-.729-3.226c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00.729-3.226 1.724 1.724 0 012.437-2.437 1.724 1.724 0 003.226-.729zM15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminGate>
      <Header />
      <SiteNav />
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

  return (
    <div className="mx-auto max-w-shelf px-4 py-6">
      <div className="flex gap-6">
        <AdminSidebar
          pathname={pathname}
          mobileNavOpen={mobileNavOpen}
          setMobileNavOpen={setMobileNavOpen}
          isSuperadmin={isSuperadmin}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function AdminSidebar({
  pathname,
  mobileNavOpen,
  setMobileNavOpen,
  isSuperadmin,
}: {
  pathname: string;
  mobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
  isSuperadmin: boolean;
}) {
  const items = NAV_ITEMS.filter((item) => !item.superadminOnly || isSuperadmin);

  return (
    <>
      <button
        className="admin-tab flex items-center gap-2 md:hidden"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        aria-label="Alternar navegação"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileNavOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
        Menu
      </button>

      <aside
        className={`${
          mobileNavOpen ? "block" : "hidden"
        } md:block md:w-52 md:flex-none`}
      >
        <nav className="border border-hairline bg-panel p-3 md:sticky md:top-4">
          <div className="mb-3 px-2 pt-1">
            <span className="font-display text-display-lg text-snow">Admin</span>
            <span className="ml-2 inline-block h-2 w-2 bg-ice" />
          </div>
          <div className="space-y-0.5">
            {items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`admin-nav-item ${active ? "admin-nav-item-active" : ""}`}
                >
                  <svg
                    className="h-4 w-4 flex-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={item.icon}
                    />
                  </svg>
                  <span>{item.label}</span>
                  {item.superadminOnly && (
                    <span className="ml-auto badge-dot bg-signal" />
                  )}
                </Link>
              );
            })}
          </div>
          <div className="mt-3 border-t border-hairline pt-3">
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="admin-nav-item"
            >
              <svg className="h-4 w-4 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Voltar ao site</span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
