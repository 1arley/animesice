"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type AdaptiveImageProps = Omit<ImageProps, "src" | "onError"> & {
  /** URL pequena e já conhecida; também é o fallback em caso de erro. */
  src: string;
  /** Original de maior resolução; vira o src direto quando não há breakpoint. */
  desktopSrc?: string;
  /** A partir de qual largura o <source> de alta resolução vale (0 = usa direto no <img>). */
  desktopMinWidth?: number;
  onError?: ImageProps["onError"];
};

/**
 * Serve a arte de maior resolução diretamente no <img> para que o preload
 * gerado por `priority` corresponda à URL realmente exibida. Com <picture> +
 * <source media="(min-width: 0px)"> o browser baixava o desktopSrc mas o
 * Next fazia preload do src pequeno — warning "preloaded but not used" e
 * download duplo. O <picture> só é usado quando há breakpoint real
 * (desktopMinWidth > 0); nos demais casos o fallback vira troca de src no
 * onError, que o <source> nunca disparava.
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

  const handleError: ImageProps["onError"] = (event) => {
    if (hasDesktopCandidate) {
      setDesktopFailed(true);
      return;
    }
    onError?.(event);
  };

  if (!hasDesktopCandidate || desktopMinWidth <= 0) {
    return (
      <Image
        {...imageProps}
        key={hasDesktopCandidate ? "preferred" : "fallback"}
        src={hasDesktopCandidate ? (desktopSrc as string) : src}
        alt={alt}
        onError={handleError}
      />
    );
  }

  return (
    <picture>
      <source
        media={`(min-width: ${desktopMinWidth}px)`}
        srcSet={desktopSrc}
        data-image-resolution="desktop"
      />
      <Image
        {...imageProps}
        key={desktopFailed ? "fallback" : "preferred"}
        src={src}
        alt={alt}
        onError={handleError}
      />
    </picture>
  );
}
