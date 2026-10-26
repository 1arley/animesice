import type { ReactNode } from "react";

/**
 * Selo curto usado em cartões e faixas do gacha: destaque (gelo),
 * posse ("SEU") ou informação neutra.
 */
export function GachaBadge({
  tone = "ice",
  children,
  className = "",
}: {
  tone?: "ice" | "owned" | "outline";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    ice: "bg-ice text-ink",
    owned: "border border-hairline font-mono text-ice",
    outline: "border border-hairline text-mist",
  } as const;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-caption ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
