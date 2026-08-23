import { type ReactNode } from "react";

/**
 * GradientText — era o "Ice" do wordmark com gradiente animado por CSS
 * (bg-clip-text + sweep). Gradiente em texto é um tell recorrente de UI
 * gerada por IA: decorativo em vez de significativo. Agora é cor sólida
 * (osso da marca), mantendo a mesma API para o Wordmark.
 */
interface GradientTextProps {
  children: ReactNode;
  className?: string;
  /** Reservado para compat — ignorado (cor sólida). */
  colors?: string[];
  /** Reservado para compat — ignorado. */
  animationSpeed?: number;
  direction?: "horizontal" | "vertical" | "diagonal";
  pauseOnHover?: boolean;
}

export function GradientText({
  children,
  className = "",
}: GradientTextProps) {
  return (
    <span className={`text-ice ${className}`}>{children}</span>
  );
}
