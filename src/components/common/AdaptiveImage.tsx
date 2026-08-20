"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type AdaptiveImageProps = Omit<ImageProps, "src" | "onError"> & {
  /** URL pequena e já conhecida; também é o fallback em caso de erro. */
  src: string;
  /** Original de maior resolução, servido apenas em telas maiores. */
  desktopSrc?: string;
  desktopMinWidth?: number;
  onError?: ImageProps["onError"];
};

/**
 * Mantém a imagem atual no HTML e no mobile. Em desktop, <picture> seleciona
 * a arte maior. Se a origem não possuir esse arquivo, remove o <source> e
 * remonta o <img> com a URL pequena, evitando capas quebradas em produção.
 *
 * O projeto usa `images.unoptimized`, então <picture> não duplica o trabalho
 * de um otimizador do Next e permite escolher a origem sem JS de viewport.
 */
export function AdaptiveImage({
  src,
  desktopSrc,
  desktopMinWidth = 768,
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
