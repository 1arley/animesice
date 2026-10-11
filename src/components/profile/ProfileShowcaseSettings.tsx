"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import type { GachaCollectionProgress } from "@/types";
import { safeImageSrc } from "@/lib/url";

type SelectableCard = {
  id: string;
  card: {
    name: string;
    image: string | null;
    rarity: string;
    animeTitle: string | null;
  };
};

export function ProfileShowcaseSettings({ userId }: { userId: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [cards, setCards] = useState<SelectableCard[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [progress, setProgress] = useState<GachaCollectionProgress[]>([]);
  const [favoriteCollectionId, setFavoriteCollectionId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [savingCards, setSavingCards] = useState(false);
  const [savingCollection, setSavingCollection] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [collectionUnavailable, setCollectionUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .gachaProfileFavoriteCardIds()
      .then((ids) => {
        if (active) setSelected(ids);
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar as cartas favoritas.",
          );
      });
    api
      .gachaCollectionProgress()
      .then((items) => {
        if (!active) return;
        setProgress(items);
        setFavoriteCollectionId(
          items.find((item) => item.favorite)?.id ?? null,
        );
        setCollectionUnavailable(items.length === 0);
      })
      .catch(() => {
        if (active) setCollectionUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .gachaCollection(userId, page, 48, "recent")
      .then((result) => {
        if (!active) return;
        setCards(result.data);
        setTotalPages(result.meta.totalPages);
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar sua coleção.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, page]);

  function toggleCard(id: string) {
    setMessage("");
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return current.length < 5 ? [...current, id] : current;
    });
  }

  async function saveCards() {
    if (savingCards) return;
    setSavingCards(true);
    setError("");
    setMessage("");
    try {
      const saved = await api.updateGachaProfileFavoriteCardIds(selected);
      setSelected(saved);
      setMessage("Cartas favoritas salvas.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar as cartas.",
      );
    } finally {
      setSavingCards(false);
    }
  }

  async function saveCollection() {
    if (savingCollection) return;
    setSavingCollection(true);
    setError("");
    setMessage("");
    try {
      const saved = await api.updateGachaCollectionPreferences({
        favoriteCollectionId,
        pinnedCollectionIds: progress
          .filter((item) => item.pinned)
          .map((item) => item.id),
      });
      setProgress(saved);
      setMessage("Coleção em destaque salva.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a coleção.",
      );
    } finally {
      setSavingCollection(false);
    }
  }

  const eligibleCollections = progress.filter(
    (item) => item.percent >= 25 && item.percent < 100,
  );

  return (
    <section className="border border-hairline bg-panel p-6 md:col-span-2">
      <div className="mb-5">
        <h2 className="font-display text-display-lg text-snow">
          Vitrine do perfil
        </h2>
        <p className="text-body-sm text-mist">
          Escolha até cinco cartas e uma coleção em andamento para destacar no
          seu perfil. As medalhas fixadas continuam sendo escolhidas na coleção
          de cartas.
        </p>
      </div>

      {message && (
        <p role="status" className="mb-4 text-body-sm text-ice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-body-sm text-signal">
          {error}
        </p>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-display-md text-snow">
              Cartas favoritas
            </h3>
            <p className="font-mono text-caption text-mist">
              {selected.length}/5 selecionadas
            </p>
          </div>
          <button
            type="button"
            onClick={saveCards}
            disabled={savingCards}
            className="btn-ice"
          >
            {savingCards ? "Salvando..." : "Salvar cartas"}
          </button>
        </div>

        {loading ? (
          <p className="text-body-sm text-mist-soft">Carregando coleção...</p>
        ) : cards.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {cards.map((item) => {
              const active = selected.includes(item.id);
              const imageUrl = item.card.image
                ? safeImageSrc(item.card.image)
                : undefined;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${active ? "Remover" : "Adicionar"} ${item.card.name}${active ? " das" : " às"} cartas favoritas`}
                  disabled={!active && selected.length >= 5}
                  onClick={() => toggleCard(item.id)}
                  className={`min-w-0 border p-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:cursor-not-allowed disabled:opacity-45 ${active ? "border-ice bg-ice/10" : "border-hairline hover:border-mist"}`}
                >
                  <div className="relative mb-2 aspect-[3/4] overflow-hidden bg-ink">
                    {imageUrl && (
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 45vw, 16vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <span className="block truncate text-body-sm text-snow">
                    {item.card.name}
                  </span>
                  <span className="block truncate font-mono text-caption text-mist">
                    {item.card.animeTitle ?? item.card.rarity}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-body-sm text-mist-soft">
            Você ainda não tem cartas para destacar.
          </p>
        )}

        {totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between font-mono text-caption text-mist">
            <button
              type="button"
              className="btn-ghost"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              className="btn-ghost"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-hairline pt-6">
        <h3 className="font-display text-display-md text-snow">
          Coleção em destaque
        </h3>
        {collectionUnavailable ? (
          <p className="mt-2 text-body-sm text-mist-soft">
            A seleção de coleção não está disponível para esta conta.
          </p>
        ) : eligibleCollections.length ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="mb-1.5 block text-caption uppercase tracking-wider text-mist">
                Coleção
              </span>
              <select
                className="field"
                value={favoriteCollectionId ?? ""}
                onChange={(event) =>
                  setFavoriteCollectionId(event.target.value || null)
                }
              >
                <option value="">Nenhuma</option>
                {eligibleCollections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.percent}%
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-ice"
              disabled={savingCollection}
              onClick={saveCollection}
            >
              {savingCollection ? "Salvando..." : "Salvar coleção"}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-body-sm text-mist-soft">
            Complete pelo menos 25% de uma coleção para poder destacá-la.
          </p>
        )}
      </div>
    </section>
  );
}
