"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { safeImageSrc } from "@/lib/url";
import { api } from "@/lib/api";
import { overlayScale, parseViewBox, svgDataUrl } from "@/lib/cosmetic-svg";

type Asset = { svg: string | null; previewUrl: string | null };

// Guarda o SVG cru (e nao o data URL) porque o viewBox precisa ser lido para
// dimensionar o overlay. Muitas cartas compartilham a mesma moldura, entao o
// cache do modulo limita a 1 requisicao por chave.
const cache = new Map<string, Asset>();

/**
 * SVG de um cosmetico (capa, moldura ou destaque) servido como documento de
 * imagem, nunca inserido no DOM da pagina.
 *
 * Sem `fit`: o SVG preenche o container como a arte da frente — mesmo
 * `object-cover`, mesma escala dos dois lados da carta. Use com
 * `object-cover` no `className` para que capas fora do aspect 3/4 sejam
 * recortadas em vez de esticadas.
 * `fit="card"`: sobrepoe a janela da arte de um container 3/4 — a moldura e
 * posicionada um pouco maior que a carta para o sangue nao ser cortado.
 *
 * Passe `svg` direto quando o item ja veio embutido (loja, preview admin).
 */
export const CosmeticSvg = memo(function CosmeticSvg({
  cosmeticKey,
  svg: inlineSvg,
  fit,
  className,
}: {
  cosmeticKey?: string | null;
  svg?: string | null;
  fit?: "card";
  className?: string;
}) {
  const key = cosmeticKey ?? null;
  const [fetched, setFetched] = useState<Asset | null>(() => (key ? (cache.get(key) ?? null) : null));

  useEffect(() => {
    if (inlineSvg || !key) return;
    const hit = cache.get(key);
    if (hit) {
      setFetched(hit);
      return;
    }
    let cancelled = false;
    setFetched(null);
    api
      .gachaCardBackSvg(key)
      .then((res) => {
        if (cancelled) return;
        const asset: Asset = { svg: res.svg ?? null, previewUrl: res.previewUrl ?? null };
        if (!asset.svg && !asset.previewUrl) return;
        cache.set(key, asset);
        setFetched(asset);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key, inlineSvg]);

  const raw = inlineSvg || fetched?.svg || null;
  const src = useMemo(
    () => (raw ? svgDataUrl(raw) : safeImageSrc(fetched?.previewUrl ?? null)),
    [raw, fetched?.previewUrl],
  );
  if (!src) return null;

  // `card` dimensiona o overlay a partir do viewBox da propria arte. A capa e o
  // verso ficam sem `fit`: preenchem o container na mesma escala da arte da
  // frente, sem overscan, entao nao ha nada a compensar aqui.
  const overlay = fit === "card" ? overlayScale(parseViewBox(raw ?? "")) : null;

  return (
    // SVG stays in an image document instead of executing in the page DOM.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={className}
      style={
        overlay
          ? {
              left: "50%",
              top: "50%",
              translate: "-50% -50%",
              width: overlay.width,
              height: overlay.height,
              // O preflight do Tailwind trava `img { max-width: 100% }`, o que
              // cortaria o sangue do overlay em 100% e desalinharia a moldura.
              maxWidth: "none",
            }
          : undefined
      }
    />
  );
});