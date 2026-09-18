"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { CardPreview } from "@/components/gacha/CardPreview";
import type { GachaPull, NotificationItem } from "@/types";

const COMPENSATION_TYPE = "COMPENSATION";

export function CompensationModal() {
  const { user } = useAuth();
  const [pending, setPending] = useState<NotificationItem | null>(null);
  const [pull, setPull] = useState<GachaPull | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!user) {
      setPending(null);
      return;
    }
    let active = true;
    api
      .listNotifications(1, 20, true)
      .then((data) => {
        if (!active) return;
        setPending(
          (data.data ?? []).find((n) => n.type === COMPENSATION_TYPE) ?? null,
        );
      })
      .catch(() => {
        if (active) setPending(null);
      });
    return () => {
      active = false;
    };
  }, [user, pull]);

  if (!user) return null;

  if (pull) return <CardPreview pull={pull} onClose={() => setPull(null)} />;

  if (!pending) return null;

  const claim = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const won = await api.gachaClaimCompensation();
      setPull(won);
      setPending(null);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={pending.title}
    >
      <div className="w-full max-w-md rounded-2xl border border-ice/25 bg-[#0B1119] p-6 shadow-glow-ice">
        <p className="font-mono text-caption uppercase tracking-[0.14em] text-ice">
          {pending.title}
        </p>
        <p className="mt-3 whitespace-pre-line font-sans text-body-sm leading-relaxed text-mist">
          {pending.body}
        </p>
        <button
          type="button"
          onClick={claim}
          disabled={busy}
          className="mt-6 w-full rounded-lg border border-ice/40 bg-ice/10 px-4 py-2.5 font-mono text-caption uppercase tracking-[0.12em] text-snow transition-colors hover:bg-ice/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ice disabled:opacity-60"
        >
          {busy ? "Resgatando..." : "Resgatar giro"}
        </button>
        {failed && (
          <p className="mt-2 text-center font-sans text-caption text-mist-soft">
            Não foi possível resgatar agora. Tente novamente.
          </p>
        )}
      </div>
    </div>
  );
}
