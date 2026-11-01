"use client";

import { useState } from "react";
import type { GachaProfileShowcase, GachaPull } from "@/types";
import { SectionLabel } from "@/components/common/SectionLabel";
import { GachaCard } from "@/components/gacha/GachaCard";
import { CardPreview } from "@/components/gacha/CardPreview";

export function ProfileShowcase({
  showcase,
}: {
  showcase: GachaProfileShowcase | null;
}) {
  const [preview, setPreview] = useState<GachaPull | null>(null);
  if (
    !showcase ||
    (showcase.cards.length === 0 &&
      !showcase.collection &&
      showcase.medals.length === 0)
  )
    return null;

  return (
    <section
      className="mx-auto mt-8 max-w-shelf px-4"
      aria-label="Vitrine do perfil"
    >
      {preview && (
        <CardPreview pull={preview} onClose={() => setPreview(null)} />
      )}
      <div className="grid gap-6 border-y border-hairline py-6 md:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]">
        <div className="min-w-0">
          <SectionLabel level={2}>Cartas favoritas</SectionLabel>
          {showcase.cards.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {showcase.cards.map((pull) => (
                <button
                  key={pull.id}
                  type="button"
                  onClick={() => setPreview(pull)}
                  aria-label={`Ver carta favorita ${pull.card.name}`}
                  className="min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice"
                >
                  <GachaCard pull={pull} linkAnime={false} />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-body-sm text-mist-soft">
              Nenhuma carta destacada.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {showcase.collection && (
            <div>
              <SectionLabel level={2}>Coleção em destaque</SectionLabel>
              <p className="text-body text-snow">{showcase.collection.name}</p>
            </div>
          )}
          {showcase.medals.length > 0 && (
            <div>
              <SectionLabel level={2}>Medalhas</SectionLabel>
              <ul
                className="flex flex-wrap gap-2"
                aria-label="Medalhas fixadas"
              >
                {showcase.medals.map((medal) => (
                  <li
                    key={`${medal.id}:${medal.version}`}
                    className="border border-amber-300/40 px-3 py-2 font-mono text-caption text-amber-300"
                  >
                    {medal.name} · v{medal.version}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
