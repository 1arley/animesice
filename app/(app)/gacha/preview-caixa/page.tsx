"use client";

import { useState } from "react";
import { BoxReveal } from "@/components/gacha/BoxReveal";

const reward = {
  category: "CRYSTAL",
  name: "Cristais de gelo",
  amount: 125,
  rarity: "RARE",
};

export default function BoxPreviewPage() {
  const [opened, setOpened] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  function openBox() {
    setResult(null);
    setOpened(true);
    window.setTimeout(() => setResult(reward), 1800);
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-ice">Preview local</p>
      <h1 className="font-display text-4xl text-snow">Caixa comum</h1>
      <p className="max-w-md text-snow/70">Abra a caixa para ver a animação. A recompensa é simulada; nenhuma chamada à API é feita.</p>
      <button className="btn-primary min-h-12 px-8" onClick={openBox} type="button">Abrir caixa</button>
      {opened && <BoxReveal tier="COMMON" reward={result} error="" onClose={() => setOpened(false)} />}
    </main>
  );
}
