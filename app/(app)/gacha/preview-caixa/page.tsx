"use client";

import { useEffect, useRef, useState } from "react";
import { BOX_LABEL, BoxReveal } from "@/components/gacha/BoxReveal";
import type { GachaBoxTier } from "@/types";

const SAMPLE_REWARDS: Record<GachaBoxTier, Record<string, unknown>> = {
  COMMON: {
    category: "CRYSTAL",
    name: "Cristais de gelo",
    amount: 125,
    rarity: "RARE",
  },
  RARE: {
    category: "CARD",
    name: "Aeliana — Pulso Violeta",
    rarity: "EPICA",
    foil: "HOLO",
    image: "/aeliana/Aeliana.png",
  },
  PREMIUM: {
    category: "CARD",
    name: "Aeliana — Coroa Soberana",
    rarity: "LENDARIA",
    foil: "GOLD",
    image: "/aeliana/Aeliana.png",
  },
};

export default function BoxPreviewPage() {
  const [openedTier, setOpenedTier] = useState<GachaBoxTier | null>(null);
  const [seq, setSeq] = useState(0);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function openBox(tier: GachaBoxTier) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setResult(null);
    setOpenedTier(tier);
    setSeq((n) => n + 1);
    timerRef.current = window.setTimeout(() => {
      setResult(SAMPLE_REWARDS[tier]);
    }, 900);
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ice">
        Preview local
      </p>
      <h1 className="font-display text-4xl text-snow">Caixas do Gacha</h1>
      <p className="max-w-md text-snow/70">
        Abra qualquer categoria para visualizar a experiência em tela cheia. As
        recompensas são simuladas; nenhuma chamada à API é feita.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {(["COMMON", "RARE", "PREMIUM"] as const).map((tier) => (
          <button
            key={tier}
            className="btn-primary min-h-12 px-7"
            onClick={() => openBox(tier)}
            type="button"
          >
            Abrir {BOX_LABEL[tier]}
          </button>
        ))}
      </div>
      {openedTier && (
        <BoxReveal
          key={seq}
          tier={openedTier}
          reward={result}
          error=""
          onClose={() => {
            if (timerRef.current !== null) {
              window.clearTimeout(timerRef.current);
              timerRef.current = null;
            }
            setOpenedTier(null);
          }}
        />
      )}
    </main>
  );
}
