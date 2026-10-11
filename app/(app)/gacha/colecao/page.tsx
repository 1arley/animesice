import type { Metadata } from "next";
import Link from "next/link";
import { GachaOwnedSkins } from "@/components/gacha/GachaOwnedSkins";
import { GachaLoadoutEditor } from "@/components/gacha/GachaLoadoutEditor";

export const metadata: Metadata = {
  title: "Minha coleção | AnimeSice",
  description: "Gerencie suas skins de perfil e personalize suas cartas.",
};

export default function GachaColecaoPage() {
  return (
    <main id="body-content" className="mx-auto max-w-shelf px-4 py-10">
      <p className="shelf-label">Gacha / Coleção</p>
      <h1 className="font-display text-display-lg text-ice">Minha coleção</h1>
      <p className="mt-2 max-w-prose text-mist">
        Gerencie as skins do seu perfil e a aparência das suas cartas.
      </p>
      <section
        id="skins"
        aria-labelledby="profile-skins-heading"
        className="mt-8 scroll-mt-24"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="profile-skins-heading"
              className="font-display text-display-sm text-ice"
            >
              Skins de perfil
            </h2>
            <p className="mt-1 text-body-sm text-mist">
              Escolha o retrato que aparece como seu avatar.
            </p>
          </div>
          <Link
            href="/gacha/enciclopedia?view=skins"
            className="btn-ghost min-h-11 px-4 py-3"
          >
            Explorar catálogo
          </Link>
        </div>
        <GachaOwnedSkins />
      </section>
      <section aria-labelledby="card-cosmetics-heading" className="mt-12">
        <h2
          id="card-cosmetics-heading"
          className="font-display text-display-sm text-ice"
        >
          Cosméticos das cartas
        </h2>
        <p className="mt-1 text-body-sm text-mist">
          Escolha a capa, a moldura e o destaque aplicados às suas cartas.
        </p>
        <div className="mt-5">
          <GachaLoadoutEditor />
        </div>
      </section>
    </main>
  );
}
