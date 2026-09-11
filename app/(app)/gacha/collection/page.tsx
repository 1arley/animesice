"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { GachaCard, GACHA_TIERS } from "@/components/gacha/GachaCard";
import { CardPreview } from "@/components/gacha/CardPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import type { GachaPull } from "@/types";

export default function GachaCollectionPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<GachaPull[]>([]);
  const [featured, setFeatured] = useState<GachaPull | null>(null);
  const [preview, setPreview] = useState<GachaPull | null>(null);
  const [sort, setSort] = useState("value");
  const [rarity, setRarity] = useState("");
  const [foil, setFoil] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [collection, current] = await Promise.all([
        api.gachaCollection(user.id, page, 24, sort, rarity, foil),
        api.gachaFeatured(),
      ]);
      setItems(collection.data);
      setTotal(collection.meta.total);
      setPages(collection.meta.totalPages);
      setFeatured(current);
    } catch {
      setError("Não foi possível carregar sua coleção.");
    } finally {
      setLoading(false);
    }
  }, [user, page, sort, rarity, foil]);

  useEffect(() => {
    void load();
  }, [load]);

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
                onClick={() =>
                  void api.setGachaFeatured(pull.id).then(setFeatured)
                }
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
    </main>
  );
}
