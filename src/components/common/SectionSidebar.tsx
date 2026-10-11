"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEventHandler, ReactNode } from "react";

export type SidebarNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  after?: ReactNode;
};

export type SidebarNavGroup = {
  label: string;
  items: readonly SidebarNavItem[];
};

export function SectionSidebar({
  title,
  ariaLabel,
  groups,
  activePath,
  onNavigate,
}: {
  title: string;
  ariaLabel: string;
  groups: readonly SidebarNavGroup[];
  activePath?: string;
  onNavigate?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const pathname = usePathname();
  const currentPath = activePath ?? pathname;
  const activeHref = groups
    .flatMap(({ items }) => items)
    .filter(({ href, exact }) =>
      exact
        ? currentPath === href
        : currentPath === href || currentPath.startsWith(`${href}/`),
    )
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  return (
    <nav aria-label={ariaLabel} className="border border-hairline bg-panel/70 p-3">
      <h2 className="mb-3 px-3 font-mono text-caption uppercase tracking-[0.2em] text-mist-soft">
        {title}
      </h2>
      <div className="space-y-4">
        {groups.filter(({ items }) => items.length > 0).map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h3 className="px-3 pb-1 font-display text-sm text-snow">
              {group.label}
            </h3>
            <ul>
              {group.items.map((item) => {
                const active = item.href === activeHref;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={item.onClick ?? onNavigate}
                      className={`flex min-h-11 items-center border-l-2 px-3 text-body-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                        active
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-transparent text-mist hover:bg-ink/60 hover:text-snow"
                      } ${item.className ?? ""}`}
                    >
                      {item.label}
                      {item.after}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
