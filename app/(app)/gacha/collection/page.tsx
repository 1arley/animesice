"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GachaCard, GACHA_TIERS, RARITY } from "@/components/gacha/GachaCard";
import { CardPreview } from "@/components/gacha/CardPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/common/SectionLabel";
import { safeImageSrc } from "@/lib/url";
import { blur } from "@/lib/blur";
import type {
  GachaEncyclopedia,
  GachaEncyclopediaCard,
  GachaPull,
} from "@/types";

function SilhouetteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="11" r="6" fill="currentColor" opacity="0.5" />
      <path
        d="M5 30c1.5-7 4.5-10 11-10s9.5 3 11 10"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}

/** Mini carta do catálogo — imagem quando possui, silhueta quando falta. */
function WikiCard({ card }: { card: GachaEncyclopediaCard }) {
  const rarity = RARITY[card.rarity] ?? RARITY.COMUM!;
  const art = safeImageSrc(card.image);
  return (
    <div>
      <div
        className={`relative overflow-hidden ${
          card.owned
            ? `border bg-panel ${rarity.border}`
            : "border border-hairline bg-ink/40"
        }`}
        style={{ aspectRatio: "3 / 4" }}
      >
        {card.owned && art ? (
          <Image
            src={art}
            alt={card.name}
            fill
            sizes="(max-width: 480px) 30vw, (max-width: 1024px) 18vw, 12vw"
            placeholder="blur"
            blurDataURL={blur.portrait}
            className="object-cover"
            quality={80}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-mist-soft">
            <SilhouetteIcon className="h-10 w-10 opacity-50" />
          </div>
        )}
        <span
          className={`absolute left-1 top-1 bg-ink/80 px-1 py-0.5 font-mono text-caption font-medium backdrop-blur-sm ${
            card.owned ? rarity.text : "text-mist"
          }`}
        >
          {card.rarity}
        </span>
      </div>
      <p
        className={`mt-1 truncate font-mono text-caption ${
          card.owned ? "text-snow" : "text-mist"
        }`}
      >
        {card.name}
      </p>
    </div>
  );
}

export default function GachaCollectionPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<GachaPull[]>([]);
  const [featured, setFeatured] = useState<GachaPull | null>(null);
  const [wiki, setWiki] = useState<GachaEncyclopedia | null>(null);
  const [preview, setPreview] = useState<GachaPull | null>(null);
  const [sort, setSort] = useState("value");
  const [rarity, setRarity] = useState("");
  const [foil, setFoil] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [featuredError, setFeaturedError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      setFeaturedError("");
      try {
        const [collection, current, enc] = await Promise.all([
          api.gachaCollection(user.id, page, 24, sort, rarity, foil),
          api.gachaFeatured(),
          api.gachaEncyclopedia().catch(() => null),
        ]);
        if (cancelled) return;
        setItems(collection.data);
        setTotal(collection.meta.total);
        setPages(collection.meta.totalPages);
        setFeatured(current);
        setWiki(enc && Array.isArray(enc.sets) ? enc : null);
      } catch {
        if (!cancelled) setError("Não foi possível carregar sua coleção.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user, page, sort, rarity, foil]);

  if (!user)
    return (
      <div className="mx-auto max-w-shelf px-4 py-16">
        <Link href="/login" className="text-ice">
          Entre para ver sua coleção.
        </Link>
      </div>
    );

  return (
    <main className="mx-auto max-w-shelf px-4 pb-16 pt-8">
      {preview && (
        <CardPreview pull={preview} onClose={() => setPreview(null)} />
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-snow">
            Minha coleção
          </h1>
          <p className="text-body-sm text-mist">{total} cartas</p>
        </div>
        <Link href="/gacha" className="btn-ghost px-4 py-2">
          Voltar ao Gacha
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <select
          aria-label="Ordenação"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="border border-hairline bg-panel p-3 text-snow"
        >
          <option value="value">Mais valiosas</option>
          <option value="recent">Recentes</option>
          <option value="rarity">Raridade</option>
          <option value="edition">Edição</option>
        </select>
        <select
          aria-label="Raridade"
          value={rarity}
          onChange={(e) => {
            setRarity(e.target.value);
            setPage(1);
          }}
          className="border border-hairline bg-panel p-3 text-snow"
        >
          <option value="">Todas as raridades</option>
          {GACHA_TIERS.map((tier) => (
            <option key={tier}>{tier}</option>
          ))}
        </select>
        <select
          aria-label="Foil"
          value={foil}
          onChange={(e) => {
            setFoil(e.target.value);
            setPage(1);
          }}
          className="border border-hairline bg-panel p-3 text-snow"
        >
          <option value="">Todos os foils</option>
          <option>NORMAL</option>
          <option>HOLO</option>
          <option>GOLD</option>
        </select>
        {total >= 20 && (
          <span className="self-center font-mono text-caption text-mist">
            Condition disponível no verso da carta
          </span>
        )}
      </div>
      {featuredError && (
        <p role="alert" className="mt-8 text-signal">{featuredError}</p>
      )}
      {error ? (
        <p role="alert" className="mt-8 text-signal">
          {error}
        </p>
      ) : loading ? (
        <div className="skeleton mt-8 h-80" aria-busy="true" />
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState text="Sua coleção está vazia." variant="compact" />
          <Link href="/gacha" className="btn-ice mt-4 inline-block px-4 py-3">
            Voltar ao Gacha
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((pull) => (
            <div key={pull.id}>
              <button
                type="button"
                onClick={() => setPreview(pull)}
                className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
              >
                <GachaCard pull={pull} linkAnime={false} />
              </button>
              <button
                type="button"
                disabled={featured?.id === pull.id}
                onClick={() => {
                  setFeaturedError("");
                  void api.setGachaFeatured(pull.id).then(setFeatured).catch(() => {
                    setFeaturedError("Não foi possível destacar a carta.");
                  });
                }}
                className="mt-2 min-h-11 w-full border border-hairline px-2 font-mono text-caption text-ice disabled:text-mist"
              >
                {featured?.id === pull.id
                  ? "Em destaque"
                  : "Destacar no perfil"}
              </button>
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="mt-8 flex gap-3">
          <button
            className="btn-ghost px-4 py-2"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <button
            className="btn-ghost px-4 py-2"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      )}

      {wiki && wiki.sets.length > 0 && (
        <section className="mt-14">
          <SectionLabel level={2}>Enciclopédia — o que falta</SectionLabel>
          <p className="mt-1 text-body-sm text-mist">
            {wiki.stats.ownedCards} de {wiki.stats.totalCards} cartas ·{" "}
            {wiki.stats.completeSets} de {wiki.stats.totalSets} sets completos
          </p>
          {wiki.stats.completeSets > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {wiki.sets
                .filter((s) => s.complete)
                .map((s) => (
                  <span
                    key={s.animeId ?? "orphan"}
                    className="inline-flex items-center gap-1.5 border border-amber-300/50 bg-amber-300/10 px-2 py-1 font-mono text-caption text-amber-200"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                      className="text-amber-300"
                    >
                      <path
                        d="m8 1 2 4.6 4.6.6-3.4 3.2.9 4.6L8 11.7 3.9 14l.9-4.6L1.4 6.2l4.6-.6L8 1Z"
                        fill="currentColor"
                      />
                    </svg>
                    {s.animeTitle ?? "Sem anime"}
                  </span>
                ))}
            </div>
          )}
          <div className="mt-6 space-y-8">
            {wiki.sets.map((set) => (
              <div key={set.animeId ?? "orphan"}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {set.animeSlug ? (
                    <h3>
                      <Link
                        href={`/animes/${set.animeSlug}`}
                        className="font-display text-body-lg text-snow transition-colors hover:text-ice"
                      >
                        {set.animeTitle ?? "Sem anime"}
                      </Link>
                    </h3>
                  ) : (
                    <h3 className="font-display text-body-lg text-snow">
                      {set.animeTitle ?? "Sem anime"}
                    </h3>
                  )}
                  <span className="font-mono text-caption text-mist">
                    {set.owned}/{set.total}
                  </span>
                  {set.complete && (
                    <span className="border border-amber-300/60 bg-amber-300/10 px-1.5 py-0.5 font-mono text-caption font-medium text-amber-200">
                      COMPLETO
                    </span>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
                  {set.cards.map((c) => (
                    <WikiCard key={c.id} card={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}