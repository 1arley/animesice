"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/common/ToastProvider";
import { GachaCardGridSkeleton } from "@/components/gacha/GachaPageSkeleton";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { GachaSkin } from "@/types";

export function GachaOwnedSkins() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [result, setResult] = useState<{
    userId: string;
    skins: GachaSkin[];
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const skins =
    !authLoading && user && result?.userId === user.id ? result.skins : null;

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    setError("");
    void api
      .gachaSkins(1, 48)
      .then((response) => {
        if (!cancelled) {
          setResult({
            userId: user.id,
            skins:
              response.owned ?? response.skins.filter((skin) => skin.owned),
          });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Não foi possível carregar suas skins.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, retry]);

  async function equip(skinId: string | null) {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await api.gachaEquipSkin(skinId);
      setResult((current) =>
        current?.userId === user.id
          ? {
              ...current,
              skins: current.skins.map((skin) => ({
                ...skin,
                equipped: skin.id === response.equippedSkinId,
              })),
            }
          : current,
      );
      toast(skinId ? "Skin equipada." : "Skin removida.", "success");
    } catch (cause: unknown) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível equipar skin.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) {
    return <GachaCardGridSkeleton label="Carregando suas skins" />;
  }

  if (!user) {
    return (
      <div className="border border-hairline bg-panel p-5">
        <p className="text-body-sm text-mist">
          Entre na sua conta para ver e equipar suas skins.
        </p>
        <Link
          href="/login"
          className="btn-ice mt-4 inline-flex min-h-11 items-center px-4"
        >
          Entrar
        </Link>
      </div>
    );
  }

  if (skins === null && error) {
    return (
      <p role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-300">
        {error}
        <button
          type="button"
          onClick={() => setRetry((current) => current + 1)}
          className="btn-ghost min-h-11 px-3"
        >
          Tentar novamente
        </button>
      </p>
    );
  }

  if (skins === null) {
    return <GachaCardGridSkeleton label="Carregando suas skins" />;
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-red-300">
          {error}
          <button
            type="button"
            onClick={() => setRetry((current) => current + 1)}
            disabled={busy}
            className="btn-ghost min-h-11 px-3"
          >
            Tentar novamente
          </button>
        </p>
      )}
      {skins.length > 0 ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-body-sm text-mist">
              {skins.length} {skins.length === 1 ? "skin" : "skins"} na sua coleção
            </p>
            {skins.some((skin) => skin.equipped) && (
              <button
                type="button"
                className="btn-ghost min-h-11 px-3 text-sm"
                onClick={() => void equip(null)}
                disabled={busy}
              >
                Usar meu avatar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {skins.map((skin) => (
              <article
                key={skin.id}
                className={`overflow-hidden border bg-panel ${skin.equipped ? "border-ice" : "border-hairline"}`}
              >
                <div className="relative aspect-square bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={skin.imageUrl}
                    alt={skin.name}
                    width={320}
                    height={320}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-sm text-ice">{skin.name}</p>
                  <button
                    type="button"
                    disabled={busy || skin.equipped}
                    aria-pressed={skin.equipped}
                    onClick={() => void equip(skin.id)}
                    className="mt-2 inline-flex min-h-11 items-center px-2 text-xs uppercase tracking-wider text-mist hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice disabled:cursor-default disabled:opacity-70"
                  >
                    {skin.equipped ? "Equipado" : "Equipar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="border border-dashed border-hairline p-5 text-body-sm text-mist">
          Você ainda não tem skins. Faça o giro semanal para começar sua coleção.{" "}
          <Link href="/gacha/skins" className="text-ice underline">
            Girar skins
          </Link>
        </p>
      )}
    </>
  );
}
