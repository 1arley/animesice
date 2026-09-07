import type { GachaPull } from "@/types";
import { SectionLabel } from "@/components/common/SectionLabel";
import { GachaCard } from "@/components/gacha/GachaCard";

/**
 * ProfileGacha — coleção de cartas do gacha: grid poster-first como os
 * favoritos, com total de cartas e valor somado no cabeçalho.
 */
export function ProfileGacha({
  items,
  total,
  totalValue,
  isPrivate,
  loading,
}: {
  items: GachaPull[];
  total: number;
  totalValue: number;
  isPrivate: boolean;
  loading: boolean;
}) {
  if (isPrivate) {
    return (
      <section>
        <SectionLabel level={2}>Cartas</SectionLabel>
        <p className="text-body-sm text-mist-soft">Coleção privada.</p>
      </section>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <section>
        <SectionLabel level={2}>Cartas</SectionLabel>
        <p className="text-body-sm text-mist-soft">
          Nenhuma carta ainda.
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionLabel level={2}>
        Cartas <span className="shelf-label-data">{total}</span>{" "}
        <span className="shelf-label-data">{totalValue} pts</span>
      </SectionLabel>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((pull) => (
          <GachaCard key={pull.id} pull={pull} />
        ))}
      </div>
    </section>
  );
}
