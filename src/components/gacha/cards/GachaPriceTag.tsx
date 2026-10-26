import type { ReactNode } from "react";

/** Linha de preço padrão dos cartões de oferta do gacha. */
export function GachaPriceTag({
  amount,
  suffix = "cristais",
  note,
  className = "",
}: {
  amount: ReactNode;
  suffix?: string;
  /** Texto curto após o preço (ex.: percentual de desconto). */
  note?: ReactNode;
  className?: string;
}) {
  return (
    <p className={`font-display text-xl tabular-nums text-ice ${className}`}>
      {amount} {suffix}
      {note && (
        <span className="text-caption font-normal text-snow"> · {note}</span>
      )}
    </p>
  );
}
