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
  const [featuredError, setFeaturedError] = useState("");
  const [rerolling, setRerolling] = useState(false);
  const [listing, setListing] = useState(false);
  const [burning, setBurning] = useState(false);
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
      if (!cancelled) setFeatured(current);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
      <ConfirmDialog
        open={rerollConfirm && preview !== null}
        title="Rerrollar carta?"
        confirmLabel="Rerrollar"
        busyLabel="Rerrollando…"
        busy={rerolling}
        onCancel={() => setRerollConfirm(false)}
        onConfirm={() => void handleReroll()}
      >
        <p className="text-body-sm text-mist">
          Sorteia nova condition e foil por{" "}
          {preview ? Math.max(1, Math.round(preview.value * 1.1)) : 0} crystals.
          Pode piorar.
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
