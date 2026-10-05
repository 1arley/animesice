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

/**
 * Folga que o verso engole antes de virar aro: nenhuma. A carta desenha frente e
 * verso na mesma escala — os dois passam pelo mesmo `object-cover` da janela 3/4
 * — entao qualquer sobra entre o plano e a borda do viewBox aparece como faixa
 * do fundo do container. Nao ha overscan para disfarcar arte mal desenhada.
 *
 * O que sobra e arredondamento de ponto flutuante: 0.2% do eixo, uns 1.5px num
 * canvas de 750, invisivel em qualquer tamanho de carta.
 */
const BACK_PLATE_SLACK = 0.002;

export type AuditLevel = "ok" | "aviso" | "erro";

export type AuditItem = {
  level: AuditLevel;
  /** A regra do padrao, em uma linha: o que a capa precisa cumprir. */
  rule: string;
  /** Por que a regra existe: o que acontece na carta se ela for furada. */
  why: string;
  /** Valor medido no rascunho, quando a regra e verificavel. */
  got?: string;
};

function numAttr(tag: string, name: string): number {
  const m = new RegExp(`\\b${name}\\s*=\\s*["']\\s*(-?[\\d.]+)`).exec(tag);
  return m ? Number(m[1]) : 0;
}

/**
 * Maior `<rect>` do arquivo — o plano de fundo que a arte e desenhada por
 * cima. E o unico proxy confiavel sem renderizar o SVG: o rect carrega as
 * coordenadas de authoring, enquanto o viewBox e so a moldura declarada.
 *
 * Heuristica assumida e nomeada de proposito: um verso tipico tem o plano como
 * o maior retangulo; uma moldura nao, e por isso a regra so vale para BACK.
 */
export function largestPlate(svg: string): ViewBox | null {
  let best: ViewBox | null = null;
  for (const m of svg.matchAll(/<rect\b[^>]*>/gi)) {
    const w = numAttr(m[0], "width");
    const h = numAttr(m[0], "height");
    if (!(w > 0 && h > 0)) continue;
    if (!best || w * h > best.w * best.h) {
      best = { x: numAttr(m[0], "x"), y: numAttr(m[0], "y"), w, h };
    }
  }
  return best;
}

/** Quanta arte se perde quando um canvas de aspect `a` entra num slot. */
function cropLoss(a: number, slot: number): number {
  return 1 - Math.min(a, slot) / Math.max(a, slot);
}

/**
 * Auditoria do padrao contra o rascunho em edicao. Cada item e uma regra do
 * contrato de autoria verificada no SVG atual, com o motivo pelo qual ela
 * existe — assim a dica do admin e o teste que trava o bug sao o mesmo
 * artefato, em vez de texto que envelhece longe da regra.
 *
 * Para BACK o plano de fundo e a medida de verdade: e ele que preenche a
 * janela. Se o maior rect nao cobre o viewBox sobram faixas sem desenho, onde
 * o fundo do container aparece.
 */
export function auditCosmetic(svg: string, type: CosmeticType): AuditItem[] {
  const want = parseViewBox(TYPE_VIEWBOX[type]);
  const vb = parseViewBox(svg, TYPE_VIEWBOX[type]);
  const items: AuditItem[] = [];

  const vbMatches = vb.x === want.x && vb.y === want.y && vb.w === want.w && vb.h === want.h;
  items.push({
    level: vbMatches ? "ok" : "erro",
    rule: `viewBox "${TYPE_VIEWBOX[type]}"`,
    why: vbMatches
      ? "Canvas na medida do slot da carta."
      : `Esta em "${vb.x} ${vb.y} ${vb.w} ${vb.h}". O verso usa object-cover: fora da medida a arte e recortada ou sobra, nunca encaixa.`,
    got: `${vb.x} ${vb.y} ${vb.w} ${vb.h}`,
  });

  if (type !== "BACK") return items;

  const plate = largestPlate(svg);
  if (!plate) {
    items.push({
      level: "erro",
      rule: "Plano de fundo cobrindo o canvas inteiro",
      why: "Nenhum <rect> no arquivo. O verso cai no fundo do container e a capa aparece vazia.",
    });
    return items;
  }

  // Faixa sem desenho entre a borda do canvas e a borda do plano, por lado.
  const gaps = {
    esquerda: plate.x - vb.x,
    direita: vb.x + vb.w - (plate.x + plate.w),
    topo: plate.y - vb.y,
    base: vb.y + vb.h - (plate.y + plate.h),
  };
  const worst = Math.max(gaps.esquerda, gaps.direita, gaps.topo, gaps.base);
  const horizontal = worst === gaps.esquerda || worst === gaps.direita;
  const frac = worst / (horizontal ? vb.w : vb.h);
  const listed = Object.entries(gaps)
    .filter(([, v]) => v > 0.5)
    .map(([k, v]) => `${Math.round(v)}px ${k}`)
    .join(" e ");

  const bleeds = frac <= BACK_PLATE_SLACK;
  items.push({
    level: bleeds ? "ok" : "erro",
    rule: "Plano de fundo cobrindo o canvas inteiro",
    why: bleeds
      ? "O plano encosta nas quatro bordas: a capa sangra ate a borda da carta."
      : `Sobra ${listed} sem desenho. A carta desenha a capa no mesmo tamanho da arte da frente, sem overscan, entao essa faixa deixa o fundo do container aparecer — e e o que parece "borda sobrando".`,
    got: `${plate.w}x${plate.h} num canvas ${vb.w}x${vb.h}`,
  });

  // O plano esta no aspect do slot? Se nao, nem viewBox nem escala resolvem.
  const plateAspect = plate.w / plate.h;
  const slotAspect = want.w / want.h;
  const aspectOk = Math.abs(plateAspect - slotAspect) < 0.005;
  items.push({
    level: aspectOk ? "ok" : "erro",
    rule: `Arte desenhada em ${want.w}x${want.h} (3/4)`,
    why: aspectOk
      ? "O plano tem o aspect do slot: o desenho cai inteiro na carta."
      : `O plano esta em ${plateAspect.toFixed(2)}:1. Corrigir so o viewBox nao resolve — o verso recorta ${(cropLoss(plateAspect, slotAspect) * 100).toFixed(1)}% da arte para fora. Redesenhe no aspect 3/4 dentro de ${want.w}x${want.h}.`,
    got: `${plateAspect.toFixed(3)}:1`,
  });

  return items;
}

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