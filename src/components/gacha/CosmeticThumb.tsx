"use client";

import Image from "next/image";
import { ART_PLATE, artWindow, overlayScale, parseViewBox, svgDataUrl } from "@/lib/cosmetic-svg";
import type { CosmeticType } from "@/lib/cosmetic-svg";

/**
 * Miniatura de um cosmético em contexto: a arte de referência fica atrás para
 * que capa, moldura e destaque sejam julgados na proporção real da carta.
 * A miniatura é sempre 3/4; o recorte do viewBox define o que aparece dentro.
 */
export function CosmeticThumb({
  svg,
  type,
  className,
  alt,
  fallbackGlow = false,
}: {
  svg: string | null | undefined;
  type: CosmeticType;
  className?: string;
  alt?: string;
  fallbackGlow?: boolean;
}) {
  const viewBox = parseViewBox(svg ?? "");
  const highlight = type === "HIGHLIGHT";
  const win = artWindow(viewBox);
  const overlay = overlayScale(viewBox);
  const src = svg ? svgDataUrl(svg) : null;
  return (
    <div className={`relative aspect-[3/4] overflow-visible bg-ink ${className ?? ""}`}>
      {highlight && src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute z-10 object-fill"
          style={{
            ...overlay,
            left: "50%",
            top: "50%",
            translate: "-50% -50%",
            maxWidth: "none",
          }}
        />
      )}
      {highlight && fallbackGlow && !src && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 shadow-[0_0_18px_rgba(252,211,77,0.45)]"
        />
      )}
      <div className="absolute inset-0 z-20 overflow-hidden bg-ink">
        {highlight ? (
          <Image src={svgDataUrl(ART_PLATE)} alt="" fill unoptimized aria-hidden className="object-cover" />
        ) : (
          <div className="absolute" style={win}>
            <Image src={svgDataUrl(ART_PLATE)} alt="" fill unoptimized aria-hidden className="object-cover" />
          </div>
        )}
        {src && !highlight ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? ""} className="absolute inset-0 h-full w-full object-fill" />
        ) : !src && !fallbackGlow ? (
          <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] text-mist">
            Sem imagem
          </span>
        ) : null}
      </div>
    </div>
  );
}
