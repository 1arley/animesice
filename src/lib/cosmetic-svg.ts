/**
 * Contrato unico de geometria dos cosmeticos SVG (capa, moldura, destaque).
 * Compartilhado entre o editor admin e a renderizacao em GachaCard para que
 * preview e jogo caiam na mesma grade.
 *
 * Por que 750x1000: e o aspect 3/4 do slot do cartao. O preview antigo usava
 * 5/7 (750x1050) e a arte chegava cortada no jogo, porque GachaCard usava
 * object-cover num canvas mais alto que o slot.
 */

/** Janela da arte: o retangulo 3/4 que mostra a imagem do anime. */
export const CARD_ART = { w: 750, h: 1000 } as const;

/**
 * Molduras e destaques sao desenhados num canvas maior que a carta: o anel
 * externo fica no "sangue" (bleed) para nao ser cortado pela janela da arte.
 */
export const BLEED = 30;

export type CosmeticType = "BACK" | "FRAME" | "HIGHLIGHT";

export type ViewBox = { x: number; y: number; w: number; h: number };

export const TYPE_VIEWBOX: Record<CosmeticType, string> = {
  BACK: `0 0 ${CARD_ART.w} ${CARD_ART.h}`,
  FRAME: `${-BLEED} ${-BLEED} ${CARD_ART.w + BLEED * 2} ${CARD_ART.h + BLEED * 2}`,
  HIGHLIGHT: `${-BLEED * 2} ${-BLEED * 2} ${CARD_ART.w + BLEED * 4} ${CARD_ART.h + BLEED * 4}`,
};

export const DEFAULT_VIEWBOX = TYPE_VIEWBOX.BACK;

export function parseViewBox(svg: string, fallback: string = DEFAULT_VIEWBOX): ViewBox {
  const raw = /viewBox\s*=\s*["']\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)/.exec(svg);
  const n = raw ? [Number(raw[1]), Number(raw[2]), Number(raw[3]), Number(raw[4])] : null;
  if (n && n.every(Number.isFinite) && n[2] > 0 && n[3] > 0) return { x: n[0], y: n[1], w: n[2], h: n[3] };
  const f = fallback.split(/\s+/).map(Number);
  return { x: f[0]!, y: f[1]!, w: f[2]!, h: f[3]! };
}

/** Recorta a janela da arte dentro do viewBox, em porcentagem do canvas. */
export function artWindow(vb: ViewBox) {
  const x0 = Math.max(0, vb.x);
  const y0 = Math.max(0, vb.y);
  const x1 = Math.min(vb.x + vb.w, CARD_ART.w);
  const y1 = Math.min(vb.y + vb.h, CARD_ART.h);
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  return {
    left: pct(x0 - vb.x, vb.w),
    top: pct(y0 - vb.y, vb.h),
    width: pct(Math.max(0, x1 - x0), vb.w),
    height: pct(Math.max(0, y1 - y0), vb.h),
  };
}

/**
 * Escala para sobrepor o canvas do cosmetico sobre um container do tamanho da
 * carta: a janela da arte do SVG cai exatamente em cima do container.
 * Ex.: viewBox -30 -30 810 1060 -> 108% x 106%.
 */
export function overlayScale(vb: ViewBox) {
  return {
    width: `${(vb.w / CARD_ART.w) * 100}%`,
    height: `${(vb.h / CARD_ART.h) * 100}%`,
  };
}

export function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/<script[\s\S]*?<\/script>/gi, ""))}`;
}

/** Arte de referencia: grade + silhueta, para revelar desalinhamento da moldura. */
export const ART_PLATE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_ART.w} ${CARD_ART.h}"><defs><linearGradient id="sky" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#1b3a63"/><stop offset=".55" stop-color="#0b1220"/><stop offset="1" stop-color="#17304d"/></linearGradient></defs><rect width="${CARD_ART.w}" height="${CARD_ART.h}" fill="url(#sky)"/><circle cx="225" cy="250" r="170" fill="#38e8da" opacity=".18"/><circle cx="560" cy="600" r="240" fill="#8b5cf6" opacity=".16"/><path d="M0 780 250 520 430 760 560 640 750 830V1000H0Z" fill="#05080e" opacity=".85"/><path d="M0 250H750M0 500H750M0 750H750M250 0V1000M500 0V1000" stroke="#8de7ff" stroke-opacity=".22" stroke-width="2" fill="none"/></svg>`;

/**
 * Chave -> tipo. O cliente so recebe as chaves em `gachaCosmetics`, entao a
 * convencao de prefixo e a unica fonte — mesma usada pela loja para itens sem
 * `type`. Mantido aqui para nao espalhar startsWith pelo codigo.
 */
export function cosmeticTypeOf(key: string): CosmeticType | null {
  if (key.startsWith("BACK_")) return "BACK";
  if (key.startsWith("FRAME_")) return "FRAME";
  if (key.startsWith("DESTAQUE_")) return "HIGHLIGHT";
  return null;
}