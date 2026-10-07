"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type GachaNavItem = readonly [href: string, label: string, description: string];
type GachaNavGroup = {
  label: string;
  description: string;
  items: readonly GachaNavItem[];
};

const groups: readonly GachaNavGroup[] = [
  {
    label: "Jogar",
    description: "Giros e personalização",
    items: [
      ["/gacha", "Girar", "Abra novas cartas"],
      ["/gacha/skins", "Skins", "Personalize seu perfil"],
    ],
  },
  {
    label: "Colecionar",
    description: "Cartas e progresso",
    items: [
      ["/gacha/cartas", "Minhas cartas", "Suas cópias e destaques"],
      ["/gacha/enciclopedia", "Enciclopédia", "Explore o catálogo"],
      ["/gacha/wishlist", "Wishlist", "Marque seus alvos"],
      ["/gacha/colecao", "Cosméticos", "Capa, moldura e destaque"],
    ],
  },
  {
    label: "Economia",
    description: "Ofertas, trocas e saldo",
    items: [
      ["/gacha/mercado", "Mercado", "Anúncios e trocas"],
      ["/gacha/mercado-noturno", "Mercado Noturno", "Ofertas de fim de semana"],
      ["/gacha/loja", "Loja", "Ofertas e cosméticos"],
      ["/gacha/cristais", "Cristais", "Saldo e histórico"],
    ],
  },
];

export function GachaNav() {
  const pathname = usePathname();
  const currentPath = pathname
    .replace(/^\/gacha\/crystals(?=\/|$)/, "/gacha/cristais")
    .replace(/^\/gacha\/encyclopedia(?=\/|$)/, "/gacha/enciclopedia");

  const activeHref = groups
    .flatMap(({ items }) => items)
    .map(([href]) => href)
    .filter((href) => currentPath === href || currentPath.startsWith(`${href}/`))
    .sort((left, right) => right.length - left.length)[0];

  const activeGroup = groups.find(({ items }) =>
    items.some(([href]) => href === activeHref),
  );

  return (
    <nav
      aria-label="Áreas do gacha"
      className="mx-auto mt-3 max-w-shelf px-4 sm:mt-4"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {groups.map((group) => {
          const current = group === activeGroup;
          return (
            <details
              key={group.label}
              open={current}
              className="group min-w-0 border border-hairline bg-panel/80"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-snow marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">
                <span>
                  <span className="block font-display text-sm">{group.label}</span>
                  <span className="mt-0.5 block text-caption text-mist">
                    {group.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-ice transition-transform group-open:rotate-180 motion-reduce:transition-none"
                >
                  ⌄
                </span>
              </summary>
              <div className="border-t border-hairline p-2">
                {group.items.map(([href, label, description]) => {
                  const active = href === activeHref;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`block min-h-11 px-3 py-3 text-body-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ice ${
                        active
                          ? "bg-ice/10 text-ice"
                          : "text-mist hover:bg-ink/60 hover:text-snow"
                      }`}
                    >
                      <span className="block">{label}</span>
                      <span className="mt-0.5 block text-caption text-mist-soft">
                        {description}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </nav>
  );
}
