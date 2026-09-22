"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  GachaCard,
  GACHA_TIERS,
  gachaConditionLabel,
} from "@/components/gacha/GachaCard";
import { CardPreview } from "@/components/gacha/CardPreview";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/components/common/ToastProvider";
import type {
  GachaCollectionProgress,
  GachaFeatured,
  GachaPull,
} from "@/types";

export default function GachaCollectionPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<GachaPull[]>([]);
  const [featured, setFeatured] = useState<GachaFeatured | null>(null);
  const [progress, setProgress] = useState<GachaCollectionProgress[]>([]);
  const [pilotEnabled, setPilotEnabled] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
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
  const [rerolling, setRerolling] = useState(false);
  const [listing, setListing] = useState(false);
  const [burning, setBurning] = useState(false);
  const [applyingRanking, setApplyingRanking] = useState(false);
  const [burnTarget, setBurnTarget] = useState<GachaPull | null>(null);
  const [rerollConfirm, setRerollConfirm] = useState(false);
  const { toast } = useToast();
  const [burnResult, setBurnResult] = useState<{
    pull: GachaPull;
    payout: number;
  } | null>(null);

  useEffect(() => {
    if (!burnResult) return;
    const timer = window.setTimeout(() => setBurnResult(null), 1200);
    return () => window.clearTimeout(timer);
  }, [burnResult]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const collection = await api.gachaCollection(
          user.id,
          page,
          24,
          sort,
          rarity,
          foil,
        );
        if (cancelled) return;
        setItems(collection.data);
        setTotal(collection.meta.total);
        setPages(collection.meta.totalPages);
      } catch {
        if (!cancelled) setError("Não foi possível carregar sua coleção.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user, page, sort, rarity, foil]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const current = await api.gachaFeatured().catch(() => null);
      if (!cancelled) {
        setFeatured(current);
        if (current?.featured?.claimed) {
          toast(
            `Destaque atualizado: +${current.featured.claimed} crystals.`,
            "success",
          );
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void api
      .gachaEngagementPilot()
      .then(async (pilot) => {
        if (cancelled) return;
        setPilotEnabled(pilot.enabled);
        if (!pilot.enabled) return;
        const collections = await api.gachaCollectionProgress();
        if (!cancelled) setProgress(collections);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar o progresso.");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function saveProgress(
    favoriteCollectionId: string | null,
    pinnedCollectionIds = progress
      .filter((collection) => collection.pinned)
      .map((collection) => collection.id),
  ) {
    if (savingProgress) return;
    setSavingProgress(true);
    try {
      setProgress(
        await api.updateGachaCollectionPreferences({
          favoriteCollectionId,
          pinnedCollectionIds,
        }),
      );
      toast("Preferências da coleção atualizadas.", "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível atualizar.",
      );
    } finally {
      setSavingProgress(false);
    }
  }

  async function handleReroll() {
    if (!preview || rerolling) return;
    const before = `${preview.conditionLabel ?? gachaConditionLabel(preview.condition)}·${preview.foil}`;
    setRerolling(true);
    try {
      const updated = await api.gachaReroll({ userCardId: preview.id });
      setPreview(updated);
      setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setRerollConfirm(false);
      const after = `${updated.conditionLabel ?? gachaConditionLabel(updated.condition)}·${updated.foil}`;
      toast(`Reroll: ${before} → ${after}.`, "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao rerrollar a carta.",
      );
    } finally {
      setRerolling(false);
    }
  }

  async function handleApplyRanking() {
    if (!preview || applyingRanking) return;
    const diff = preview.value - (preview.rankedValue ?? preview.value);
    setApplyingRanking(true);
    try {
      const updated = await api.gachaApplyRanking({
        userCardId: preview.id,
      });
      setPreview(updated);
      setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast(`Ranking atualizado: +${diff} pts.`, "success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao aplicar ao ranking.",
      );
    } finally {
      setApplyingRanking(false);
    }
  }

  async function handleList(price: number) {
    if (!preview || listing) return;
    setListing(true);
    try {
      await api.gachaListCreate({ userCardId: preview.id, price });
      setPreview(null);
      toast("Carta anunciada no mercado.", "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao anunciar a carta.",
      );
    } finally {
      setListing(false);
    }
  }

  async function handleBurn() {
    if (!burnTarget || burning) return;
    setBurning(true);
    try {
      const target = burnTarget;
      const result = await api.gachaBurn({ userCardId: target.id });
      setItems((prev) => prev.filter((pull) => pull.id !== target.id));
      setTotal((value) => Math.max(0, value - 1));
      setPreview(null);
      setBurnTarget(null);
      setBurnResult({ pull: target, payout: result.payout });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao queimar a carta.");
    } finally {
      setBurning(false);
    }
  }

  if (!user)
    return (
      <div className="mx-auto max-w-shelf px-4 py-16">
        <Link href="/entrar" className="text-ice">
          Entre para ver sua coleção.
        </Link>
      </div>
    );

  return (
    <main className="mx-auto max-w-shelf px-4 pb-16 pt-8">
      {preview && (
        <CardPreview
          pull={preview}
          onClose={() => setPreview(null)}
          canReroll={preview.user.id === user.id}
          rerolling={rerolling}
          onReroll={() => setRerollConfirm(true)}
          rerollConfirm={rerollConfirm}
          onRerollConfirm={() => void handleReroll()}
          onRerollCancel={() => setRerollConfirm(false)}
          onChange={(updated) => {
            setPreview(updated);
            setItems((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            );
          }}
          listing={listing}
          burning={burning}
          onBurn={
            preview.user.id === user.id
              ? () => {
                  setBurnTarget(preview);
                  setPreview(null);
                }
              : undefined
          }
          onList={
            preview.user.id === user.id
              ? (price) => void handleList(price)
              : undefined
          }
          applyingRanking={applyingRanking}
          onApplyRanking={
            preview.user.id === user.id
              ? () => void handleApplyRanking()
              : undefined
          }
        />
      )}
      <ConfirmDialog
        open={burnTarget !== null}
        title="Queimar carta?"
        confirmLabel="Queimar carta"
        busyLabel="Queimando…"
        busy={burning}
        onCancel={() => setBurnTarget(null)}
        onConfirm={() => void handleBurn()}
      >
        <p className="text-body-sm text-mist">
          Você receberá{" "}
          {burnTarget ? Math.max(1, Math.floor(burnTarget.value * 0.4)) : 0}{" "}
          crystals. Ação irreversível.
        </p>
      </ConfirmDialog>
      {burnResult && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-0 z-[140] flex items-center justify-center bg-ink/85 p-6"
        >
          <div className="text-center">
            <div
              className="card-burn-visual mx-auto w-44 sm:w-52"
              aria-hidden="true"
            >
              <GachaCard
                pull={burnResult.pull}
                linkAnime={false}
                showInfo={false}
              />
            </div>
            <p className="mt-5 font-display text-display-sm text-snow">
              Carta queimada
            </p>
            <p className="mt-1 font-mono text-body-sm text-amber-300">
              +{burnResult.payout} crystals
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-snow">
            Minha coleção
          </h1>
          <p className="text-body-sm text-mist">{total} cartas</p>
        </div>
        <Link href="/gacha/enciclopedia" className="btn-ice px-4 py-2">
          Explorar enciclopédia
        </Link>
        <Link href="/gacha" className="btn-ghost px-4 py-2">
          Voltar ao Gacha
        </Link>
      </div>
      {pilotEnabled && (featured || progress.length > 0) && (
        <section
          aria-labelledby="collection-progress-title"
          className="mt-8 border border-hairline bg-panel/70 p-4 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                id="collection-progress-title"
                className="font-display text-display-sm text-snow"
              >
                Progresso das coleções
              </h2>
              <p className="mt-1 text-body-sm text-mist">
                Tudo atualizado. Descobertas permanecem mesmo após uma troca.
              </p>
            </div>
            {featured?.featured?.enabled && (
              <div className="border border-ice/30 px-4 py-3 text-right">
                <p className="font-mono text-caption uppercase text-ice">
                  Destaque ativo
                </p>
                <p className="mt-1 text-body-sm text-snow">
                  {featured.featured.ratePercentPerTwoHours}% a cada 2h · teto{" "}
                  {featured.featured.dailyCapPercent}% ao dia
                </p>
                <p className="text-caption text-mist">
                  Acumula por até {featured.featured.accumulationDays} dias
                </p>
              </div>
            )}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {progress.map((collection) => {
              const pinnedIds = progress
                .filter((item) => item.pinned)
                .map((item) => item.id);
              return (
                <article
                  key={`${collection.id}:${collection.version}`}
                  className="border border-hairline bg-ink/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-display text-title-sm text-snow">
                      {collection.name}
                    </h3>
                    <span className="font-mono text-caption text-mist">
                      {collection.discovered}/{collection.total}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Progresso de ${collection.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={collection.percent}
                    className="mt-3 h-2 overflow-hidden bg-white/10"
                  >
                    <div
                      className="h-full bg-ice transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${collection.percent}%` }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {collection.rewards.reward50At && (
                      <span className="flex min-h-11 items-center border border-white/15 px-3 font-mono text-caption text-snow">
                        Título: Colecionador de {collection.name}
                      </span>
                    )}
                    {collection.percent >= 25 && collection.percent < 100 && (
                      <button
                        type="button"
                        disabled={savingProgress}
                        onClick={() =>
                          void saveProgress(
                            collection.favorite ? null : collection.id,
                          )
                        }
                        className="min-h-11 border border-ice/40 px-3 font-mono text-caption text-ice disabled:opacity-50"
                      >
                        {collection.favorite
                          ? "Favorita · peso 1× → 1,15×"
                          : "Usar peso 1× → 1,15×"}
                      </button>
                    )}
                    {collection.rewards.reward100At && (
                      <button
                        type="button"
                        disabled={
                          savingProgress ||
                          (!collection.pinned && pinnedIds.length >= 3)
                        }
                        onClick={() =>
                          void saveProgress(
                            progress.find((item) => item.favorite)?.id ?? null,
                            collection.pinned
                              ? pinnedIds.filter((id) => id !== collection.id)
                              : [...pinnedIds, collection.id],
                          )
                        }
                        className="min-h-11 border border-amber-300/40 px-3 font-mono text-caption text-amber-300 disabled:opacity-50"
                      >
                        {collection.pinned ? "Medalha fixada" : "Fixar medalha"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
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
        <p role="alert" className="mt-8 text-signal">
          {featuredError}
        </p>
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
                  void api
                    .setGachaFeatured(pull.id)
                    .then((next) => {
                      setFeatured(next);
                      toast("Carta em destaque no perfil.", "success");
                    })
                    .catch(() => {
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
    </main>
  );
}
