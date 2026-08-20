"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type AdaptiveImageProps = Omit<ImageProps, "src" | "onError"> & {
  /** URL pequena e já conhecida; também é o fallback em caso de erro. */
  src: string;
  /** Original de maior resolução, usado como <source> (todas as telas por padrão). */
  desktopSrc?: string;
  /** A partir de qual largura o <source> de alta resolução vale (0 = sempre). */
  desktopMinWidth?: number;
  onError?: ImageProps["onError"];
};

/**
 * Mantém a imagem pequena no HTML (LCP/fallback) e troca para a arte maior em
 * TODAS as telas — celular incluído, onde a qualidade também é exigida. Se a
 * origem não possuir esse arquivo, remove o <source> e remonta o <img> com a
 * URL pequena, evitando capas quebradas em produção.
 *
 * O projeto usa `images.unoptimized`, então <picture> não duplica o trabalho
 * de um otimizador do Next e permite escolher a origem sem JS de viewport.
 */
export function AdaptiveImage({
  src,
  desktopSrc,
  desktopMinWidth = 0,
  onError,
  alt,
  ...imageProps
}: AdaptiveImageProps) {
  const [desktopFailed, setDesktopFailed] = useState(false);
  const hasDesktopCandidate = Boolean(
    desktopSrc && desktopSrc !== src && !desktopFailed,
  );

  return (
    <picture>
      {hasDesktopCandidate && (
        <source
          media={`(min-width: ${desktopMinWidth}px)`}
          srcSet={desktopSrc}
          data-image-resolution="desktop"
        />
      )}
      <Image
        {...imageProps}
        key={desktopFailed ? "fallback" : "preferred"}
        src={src}
        alt={alt}
        onError={(event) => {
          if (hasDesktopCandidate) {
            setDesktopFailed(true);
            return;
          }
          onError?.(event);
        }}
      />
    </picture>
  );
}
