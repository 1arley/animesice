import type { ReactNode } from "react";

/**
 * Grade padrão das ofertas do gacha (2 colunas, 3 em telas grandes).
 * Quando não há itens, troca a lista pelo mesmo recado tracejado usado
 * por todas as seções, evitando losangos vazios desalinhados.
 */
export function GachaOfferGrid({
  empty = false,
  emptyLabel = "Nenhuma oferta disponível no momento.",
  className = "",
  children,
}: {
  empty?: boolean;
  emptyLabel?: string;
  className?: string;
  children?: ReactNode;
}) {
  if (empty) {
    return (
      <p
        className={`mt-4 border border-dashed border-hairline p-5 text-body-sm text-mist ${className}`}
      >
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul
      className={`mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {children}
    </ul>
  );
}
