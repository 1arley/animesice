"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import { AdminGate } from "@/components/common/AdminGate";

/**
 * Layout admin: fonte única do chrome para /admin/**.
 * Envolve todas as páginas /admin com gate + Header + SiteNav + Footer.
 * Páginas individuais não devem importar AdminGate/Header/SiteNav/Footer.
 */
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminLayoutInner>{children}</AdminLayoutInner>
  );
}

function AdminLayoutInner({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminGate>
      <Header />
      <SiteNav />
      <main className="mx-auto max-w-shelf px-4 py-6">{children}</main>
      <Footer />
    </AdminGate>
  );
}
