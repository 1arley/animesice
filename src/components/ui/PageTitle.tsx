"use client";

import type { ReactNode } from "react";
import { BlurText } from "@/components/core/BlurText";

/**
 * PageTitle — título de página com reveal por palavra (BlurText) no padrão
 * do site: um <h1> mono com o dot de gelo (variante `shelf`) ou a marca
 * display grande (variante `display`).
 *
 * `badge` é conteúdo ESTÁTICO (ex.: "24 resultados") renderizado depois das
 * palavras animadas — participa do flex-wrap do h1 e do gap do .shelf-label,
 * sem ser animado (dados que mudam a cada fetch não devem ter reveal).
 * prefers-reduced-motion: o BlurText renderiza o texto estático.
 */

interface PageTitleProps {
  /** Texto do título (animado palavra a palavra). */
  text: string;
  /** Conteúdo estático opcional após o título (badge de dados). */
  badge?: ReactNode;
  /**
   * `shelf` — h1 mono do padrão das páginas internas (.shelf-label);
   * `display` — h1 display grande (página de anime).
   */
  variant?: "shelf" | "display";
  /** Classes extras para o h1 (tema de cor, tamanho, etc.). */
  className?: string;
}

export function PageTitle({
  text,
  badge,
  variant = "shelf",
  className = "",
}: PageTitleProps) {
  const h1Classes =
    variant === "display"
      ? `font-display text-display-lg text-snow md:text-display-xl ${className}`
      : `shelf-label gap-[0.25em] ${className}`;

  return (
    <BlurText
      as="h1"
      text={text}
      delay={60}
      stepDuration={0.28}
      className={h1Classes}
    >
      {badge != null && (
        <span className="shelf-label-data ml-[0.375rem] whitespace-nowrap">
          {badge}
        </span>
      )}
    </BlurText>
  );
}
