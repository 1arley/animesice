"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NIGHT_MARKET_HREF = "/gacha/mercado-noturno";

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
  const [nightMarketWeekend, setNightMarketWeekend] = useState("");
  const [nightMarketClicked, setNightMarketClicked] = useState(false);

  useEffect(() => {
    const updateWeekend = () => {
      const now = new Date();
      const weekday = now.getUTCDay();
      if (weekday !== 0 && weekday !== 6) {
        setNightMarketWeekend("");
        setNightMarketClicked(false);
        return;
      }

      const saturday = new Date(now);
      if (weekday === 0) saturday.setUTCDate(saturday.getUTCDate() - 1);
      const weekend = saturday.toISOString().slice(0, 10);
      setNightMarketWeekend(weekend);
      try {
        setNightMarketClicked(
          localStorage.getItem("animesice:night-market-clicked") === weekend,
        );
      } catch {
        setNightMarketClicked(false);
      }
    };

    updateWeekend();
    const interval = window.setInterval(updateWeekend, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const currentPath = pathname
    .replace(/^\/gacha\/crystals(?=\/|$)/, "/gacha/cristais")
    .replace(/^\/gacha\/encyclopedia(?=\/|$)/, "/gacha/enciclopedia");

  const activeHref = groups
    .flatMap(({ items }) => items)
    .filter(([href]) => href !== NIGHT_MARKET_HREF || nightMarketWeekend)
    .map(([href]) => href)
    .filter(
      (href) => currentPath === href || currentPath.startsWith(`${href}/`),
    )
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
                  <span className="block font-display text-sm">
                    {group.label}
                  </span>
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
                {group.items
                  .filter(
                    ([href]) =>
                      href !== NIGHT_MARKET_HREF || nightMarketWeekend,
                  )
                  .map(([href, label, description]) => {
                    const active = href === activeHref;
                    const highlightNightMarket =
                      href === NIGHT_MARKET_HREF && !nightMarketClicked;
                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => {
                          if (!highlightNightMarket) return;
                          try {
                            localStorage.setItem(
                              "animesice:night-market-clicked",
                              nightMarketWeekend,
                            );
                          } catch {
                            // Keep the link usable when browser storage is unavailable.
                          }
                          setNightMarketClicked(true);
                        }}
                        className={`block min-h-11 px-3 py-3 text-body-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ice ${
                          active
                            ? "bg-ice/10 text-ice"
                            : "text-mist hover:bg-ink/60 hover:text-snow"
                        } ${highlightNightMarket ? "night-market-nav-new" : ""}`}
                      >
                        <span className="block">{label}</span>
                        <span className="mt-0.5 block text-caption text-mist-soft">
                          {description}
                        </span>
                        {highlightNightMarket && (
                          <span className="sr-only">
                            Nova oferta neste fim de semana
                          </span>
                        )}
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
