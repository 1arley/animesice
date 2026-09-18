"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["/gacha", "Girar", "Abra novas cartas"],
  ["/gacha/colecao", "Coleção", "Veja suas cópias"],
  ["/gacha/enciclopedia", "Enciclopédia", "Explore o catálogo"],
  ["/gacha/skins", "Skins", "Personalize seu perfil"],
  ["/gacha/wishlist", "Wishlist", "Marque seus alvos"],
  ["/gacha/trocas", "Trocas", "Negocie com pessoas"],
  ["/gacha/mercado", "Mercado", "Compre e anuncie"],
  ["/gacha/cristais", "Cristais", "Saldo e histórico"],
] as const;

export function GachaNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Áreas do gacha" className="mx-auto mt-4 max-w-shelf px-4">
      <div className="overflow-x-auto border-y border-hairline bg-panel/80">
        <div className="grid min-w-max grid-flow-col auto-cols-[9rem] lg:min-w-0 lg:grid-flow-row lg:grid-cols-8">
          {items.map(([href, label, description]) => {
            const active =
              href === "/gacha" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group min-h-16 border-r border-hairline px-3 py-3 outline-none transition-colors last:border-r-0 focus-visible:bg-ice/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ice ${
                  active
                    ? "bg-ice/10 text-snow"
                    : "text-mist hover:bg-ink/60 hover:text-snow"
                }`}
              >
                <span className="block font-display text-sm">{label}</span>
                <span className="mt-1 hidden text-[11px] leading-tight text-mist-soft xl:block">
                  {description}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
