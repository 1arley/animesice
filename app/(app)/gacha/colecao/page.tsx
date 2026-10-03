import type { Metadata } from "next";
import { GachaLoadoutEditor } from "@/components/gacha/GachaLoadoutEditor";

export const metadata: Metadata = {
  title: "Minha coleção | AnimeSice",
  description: "Gerencie capa, moldura e destaque das suas cartas.",
};

export default function GachaColecaoPage() {
  return (
    <main id="body-content" className="mx-auto max-w-shelf px-4 py-10">
      <p className="shelf-label">Gacha / Coleção</p>
      <h1 className="font-display text-display-lg text-ice">Minha coleção</h1>
      <p className="mt-2 max-w-prose text-mist">
        Escolha a capa, a moldura e o destaque aplicados às suas cartas. A troca é
        imediata e vale para toda a coleção.
      </p>
      <div className="mt-8">
        <GachaLoadoutEditor />
      </div>
    </main>
  );
}