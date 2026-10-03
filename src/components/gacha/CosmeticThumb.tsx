"use client";

import Image from "next/image";
import { ART_PLATE, artWindow, parseViewBox, svgDataUrl } from "@/lib/cosmetic-svg";
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
}: {
  svg: string | null | undefined;
  type: CosmeticType;
  className?: string;
  alt?: string;
}) {
  const win = artWindow(parseViewBox(svg ?? ""));
  const src = svg ? svgDataUrl(svg) : null;
  return (
    <div className={`relative aspect-[3/4] overflow-hidden bg-ink ${className ?? ""}`}>
      <div className="absolute" style={win}>
        <Image src={svgDataUrl(ART_PLATE)} alt="" fill unoptimized aria-hidden className="object-cover" />
      </div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? ""} className="absolute inset-0 h-full w-full object-fill" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] text-mist">
          Sem imagem
        </span>
      )}
      {alt && <span className="sr-only">{alt}</span>}
    </div>
  );
}