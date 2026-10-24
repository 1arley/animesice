"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { api } from "@/lib/api";

const NIGHT_MARKET_HREF = "/gacha/mercado-noturno";
const NIGHT_MARKET_CLICKED_KEY = "animesice:night-market-clicked";
const MARKET_CLOCK = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const items = {
  spin: { href: "/gacha", label: "Girar", icon: "spin" },
  skins: { href: "/gacha/skins", label: "Girar skins" },
  cards: { href: "/gacha/cartas", label: "Minhas cartas", icon: "cards" },
  encyclopedia: { href: "/gacha/enciclopedia", label: "Enciclopédia" },
  wishlist: { href: "/gacha/wishlist", label: "Wishlist" },
  cosmetics: { href: "/gacha/colecao", label: "Skins e cosméticos" },
  tradeUp: { href: "/gacha/trade-up", label: "Trade-up" },
  market: { href: "/gacha/mercado", label: "Mercado", icon: "market" },
  nightMarket: {
    href: NIGHT_MARKET_HREF,
    label: "Mercado Noturno",
  },
  shop: { href: "/gacha/loja", label: "Loja", icon: "shop" },
  crystals: { href: "/gacha/cristais", label: "Cristais" },
  inventory: { href: "/gacha/inventario", label: "Inventário" },
} as const;

const groups = [
  { label: "Jogar", items: [items.spin, items.skins] },
  {
    label: "Colecionar",
    items: [items.cards, items.tradeUp, items.encyclopedia, items.wishlist, items.cosmetics],
  },
  {
    label: "Economia",
    items: [items.market, items.nightMarket, items.shop, items.inventory, items.crystals],
  },
] as const;

const primaryItems = [items.spin, items.cards, items.market, items.shop] as const;

const iconPaths = {
  spin: "M20 7v5h-5M4 17v-5h5M5.6 9A7 7 0 0 1 18 6.5L20 9M4 15l2 2.5A7 7 0 0 0 18.4 15",
  cards: "M7 4h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM5 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12M10 9h6M10 13h6",
  market: "M3 10h18M5 10v9h14v-9M4 10l1-5h14l1 5M9 19v-5h6v5",
  shop: "M6 4h12l1 4H5l1-4ZM5 8v11h14V8M9 12h6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
} as const;

function NavIcon({
  name,
  active = false,
}: {
  name: keyof typeof iconPaths;
  active?: boolean;
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={iconPaths[name]}
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GachaNav() {
  const pathname = usePathname();
  const [nightMarketPeriod, setNightMarketPeriod] = useState<string | null>();
  const [nightMarketClicked, setNightMarketClicked] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: number;

    const refreshNightMarket = async () => {
      try {
        const { open, periodStart } = await api.gachaNightMarketStatus();
        if (!mounted) return;
        setNightMarketPeriod(open ? periodStart : null);
      } catch {
        if (mounted) {
          // Keep the link available and retry if the public status endpoint is unreachable.
          timer = window.setTimeout(() => void refreshNightMarket(), 5 * 60_000);
        }
        return;
      }

      const now = new Date();
      const marketTime = Object.fromEntries(
        MARKET_CLOCK.formatToParts(now).map(({ type, value }) => [type, value]),
      );
      const marketDate = Date.UTC(
        Number(marketTime.year),
        Number(marketTime.month) - 1,
        Number(marketTime.day),
        Number(marketTime.hour),
        Number(marketTime.minute),
        Number(marketTime.second),
      );
      const nextMarketDay = Date.UTC(
        Number(marketTime.year),
        Number(marketTime.month) - 1,
        Number(marketTime.day) + 1,
      );
      timer = window.setTimeout(
        () => void refreshNightMarket(),
        nextMarketDay - marketDate + 50,
      );
    };

    void refreshNightMarket();
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!nightMarketPeriod) {
      setNightMarketClicked(false);
      return;
    }
    try {
      setNightMarketClicked(
        localStorage.getItem(NIGHT_MARKET_CLICKED_KEY) === nightMarketPeriod,
      );
    } catch {
      setNightMarketClicked(false);
    }
  }, [nightMarketPeriod]);

  const currentPath = pathname
    .replace(/^\/gacha\/crystals(?=\/|$)/, "/gacha/cristais")
    .replace(/^\/gacha\/encyclopedia(?=\/|$)/, "/gacha/enciclopedia");
  const isVisible = (item: { href: string }) =>
    item.href !== NIGHT_MARKET_HREF || nightMarketPeriod !== null;
  const visibleItems = groups.flatMap(({ items: groupItems }) =>
    groupItems.filter(isVisible),
  );
  const activeHref = visibleItems
    .map(({ href }) => href)
    .filter(
      (href) =>
        currentPath === href ||
        (href !== "/gacha" && currentPath.startsWith(`${href}/`)),
    )
    .sort((left, right) => right.length - left.length)[0];
  const moreActive =
    !!activeHref && !primaryItems.some(({ href }) => href === activeHref);
  const markNightMarketClicked = () => {
    if (!nightMarketPeriod) return;
    try {
      localStorage.setItem(NIGHT_MARKET_CLICKED_KEY, nightMarketPeriod);
    } catch {
      // Keep the link usable when browser storage is unavailable.
    }
    setNightMarketClicked(true);
  };

  return (
    <>
      <aside className="hidden w-56 shrink-0 self-start lg:sticky lg:top-4 lg:mt-8 lg:block lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
        <nav
          aria-label="Áreas do Gacha"
          className="border border-hairline bg-panel/70 p-3"
        >
          <h2 className="mb-3 px-3 font-mono text-caption uppercase tracking-[0.2em] text-mist-soft">
            Gacha
          </h2>
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <h3 className="px-3 pb-1 font-display text-sm text-snow">
                  {group.label}
                </h3>
                <ul>
                  {group.items.filter(isVisible).map(({ href, label }) => {
                    const active = href === activeHref;
                    const highlightNightMarket =
                      href === NIGHT_MARKET_HREF &&
                      !!nightMarketPeriod &&
                      !nightMarketClicked;
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          aria-current={active ? "page" : undefined}
                          onClick={
                            highlightNightMarket
                              ? markNightMarketClicked
                              : undefined
                          }
                          className={`flex min-h-11 items-center border-l-2 px-3 text-body-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                            active
                              ? "border-ice bg-ice/10 text-ice"
                              : "border-transparent text-mist hover:bg-ink/60 hover:text-snow"
                          } ${highlightNightMarket ? "night-market-nav-new" : ""}`}
                        >
                          {label}
                          {highlightNightMarket && (
                            <span className="sr-only">
                              Nova oferta neste período
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </nav>
      </aside>

      <nav
        aria-label="Navegação do Gacha"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-ink lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {primaryItems.map(({ href, label, icon }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-center font-mono text-caption leading-tight transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ice ${
                  active ? "text-ice" : "text-mist hover:text-snow"
                }`}
              >
                <NavIcon name={icon} active={active} />
                <span>{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 py-1.5 font-mono text-caption transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ice ${
              moreActive || moreOpen ? "text-ice" : "text-mist hover:text-snow"
            }`}
          >
            <NavIcon name="more" active={moreActive || moreOpen} />
            Mais
          </button>
        </div>
      </nav>

      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Mais no Gacha"
      >
        <div className="space-y-4">
          {groups.map((group) => {
            const remainingItems = group.items.filter(
              (item) =>
                isVisible(item) &&
                !primaryItems.some(({ href }) => href === item.href),
            );
            if (!remainingItems.length) return null;
            return (
              <section key={group.label} aria-label={group.label}>
                <h4 className="mb-1 font-display text-sm text-snow">
                  {group.label}
                </h4>
                <ul>
                  {remainingItems.map(({ href, label }) => {
                    const highlightNightMarket =
                      href === NIGHT_MARKET_HREF &&
                      !!nightMarketPeriod &&
                      !nightMarketClicked;
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          aria-current={href === activeHref ? "page" : undefined}
                          onClick={() => {
                            if (highlightNightMarket) markNightMarketClicked();
                            setMoreOpen(false);
                          }}
                          className={`flex min-h-11 items-center border-l-2 px-3 text-body-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice ${
                            href === activeHref
                              ? "border-ice bg-ice/10 text-ice"
                              : "border-transparent text-mist hover:bg-ink/60 hover:text-snow"
                          } ${highlightNightMarket ? "night-market-nav-new" : ""}`}
                        >
                          {label}
                          {highlightNightMarket && (
                            <span className="sr-only">
                              Nova oferta neste período
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
