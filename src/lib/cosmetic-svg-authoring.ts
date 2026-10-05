/**
 * Autoria dos cosmeticos SVG (capa, moldura, destaque): modelo editavel e o
 * round-trip entre o arquivo e as camadas da tela.
 *
 * O contrato e semantico, nao textual: parse -> edicao -> serialize preserva
 * os metadados da raiz, a ordem visual, os atributos editaveis e as subarvores
 * que o editor nao modela (`defs`, grupos, circulos). So a formatacao XML e
 * normalizada. Perder um `defs` ou a posicao de um grupo muda o desenho; perder
 * espaco em branco nao.
 *
 * O parse usa `DOMParser` e roda apenas no navegador, no fluxo admin. Nada
 * daqui entra no render do servidor.
 *
 * Por que os atributos nao modelados ficam no layer em vez de virar um editor
 * generico de SVG: um `<rect>` desenhado a mao costuma trazer `rx`, `opacity`,
 * `transform`. Descartar esses atributos no round-trip muda a arte sem o autor
 * ter tocado nela — que e exatamente o bug que a extra de `defs` ja causava.
 */

import {
  BLEED,
  CARD_ART,
  TYPE_VIEWBOX,
  type CosmeticType,
} from "@/lib/cosmetic-svg";

export type Layer = {
  id: string;
  type: "rect" | "text";
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  hidden?: boolean;
  /** Atributos que o editor nao modela, preservados como vieram. */
  rest: Record<string, string>;
};

export type SceneNode =
  | { kind: "layer"; layer: Layer }
  | { kind: "opaque"; html: string };

export type Scene = {
  viewBox: string;
  /** Atributos da raiz menos `xmlns` e `viewBox`, que o modulo reinsere. */
  rootAttrs: Record<string, string>;
  nodes: SceneNode[];
};

/** Atributos que o editor edita; o resto vai para `rest`. */
const MODELLED: Record<Layer["type"], string[]> = {
  rect: ["x", "y", "width", "height", "fill", "stroke", "stroke-width", "display"],
  text: ["x", "y", "fill", "display"],
};

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function attrPairs(el: Element, skip: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (!skip.includes(attr.name)) out[attr.name] = attr.value;
  }
  return out;
}

function numAttr(el: Element, name: string): number {
  const n = Number(el.getAttribute(name));
  return Number.isFinite(n) ? n : 0;
}

/**
 * `DOMParser` ja devolve `textContent` com as entidades resolvidas. Decodificar
 * de novo viraria "&amp;amp;" em "&", reescrevendo o texto do autor.
 */
function parseLayer(el: Element): Layer {
  const type = el.tagName === "text" ? "text" : "rect";
  const stroke = el.getAttribute("stroke") ?? undefined;
  return {
    id: crypto.randomUUID(),
    type,
    x: numAttr(el, "x"),
    y: numAttr(el, "y"),
    width: type === "rect" ? numAttr(el, "width") : undefined,
    height: type === "rect" ? numAttr(el, "height") : undefined,
    fill: el.getAttribute("fill") ?? "#000000",
    stroke: stroke === "none" ? undefined : stroke,
    strokeWidth: stroke && stroke !== "none" ? numAttr(el, "stroke-width") || 4 : undefined,
    text: type === "text" ? el.textContent ?? "" : undefined,
    hidden: el.getAttribute("display") === "none" || undefined,
    rest: attrPairs(el, [...MODELLED[type], ...(type === "rect" ? [] : ["font-size", "font-family"])]),
  };
}

/** Bandas de moldura: 4 retangulos fora da janela da arte, sem cobrir a arte. */
export function starterScene(type: CosmeticType): Scene {
  const band = (x: number, y: number, width: number, height: number, fill: string): Layer => ({
    id: crypto.randomUUID(),
    type: "rect",
    x,
    y,
    width,
    height,
    fill,
    rest: {},
  });
  if (type === "FRAME") {
    return {
      viewBox: TYPE_VIEWBOX.FRAME,
      rootAttrs: {},
      nodes: [
        { kind: "layer", layer: band(-BLEED, -BLEED, CARD_ART.w + BLEED * 2, BLEED, "#142d4c") },
        { kind: "layer", layer: band(-BLEED, CARD_ART.h, CARD_ART.w + BLEED * 2, BLEED, "#142d4c") },
        { kind: "layer", layer: band(-BLEED, 0, BLEED, CARD_ART.h, "#142d4c") },
        { kind: "layer", layer: band(CARD_ART.w, 0, BLEED, CARD_ART.h, "#142d4c") },
      ],
    };
  }
  if (type === "HIGHLIGHT") {
    return {
      viewBox: TYPE_VIEWBOX.HIGHLIGHT,
      rootAttrs: {},
      nodes: [
        {
          kind: "layer",
          layer: { ...band(24, 24, CARD_ART.w - 48, CARD_ART.h - 48, "none"), stroke: "#fcd34d", strokeWidth: 10 },
        },
      ],
    };
  }
  return {
    viewBox: TYPE_VIEWBOX.BACK,
    rootAttrs: {},
    nodes: [
      {
        kind: "layer",
        layer: { id: "bg", type: "rect", x: 0, y: 0, width: CARD_ART.w, height: CARD_ART.h, fill: "#142d4c", rest: {} },
      },
    ],
  };
}

export function parseScene(svg: string, type: CosmeticType): Scene {
  const root = new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("svg");
  if (!root) return starterScene(type);
  // `outerHTML` de um elemento de um documento XML reinsere o `xmlns` do pai na
  // raiz do fragmento. Dentro do `<svg>` que remontamos ele e redundante e so
  // polui o textarea com o mesmo atributo em cada no preservado.
  const opaque = (html: string) => html.replace(/^(<[a-zA-Z][\w:-]*) xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, "$1");
  const nodes = Array.from(root.children).map((el) =>
    el.tagName === "rect" || el.tagName === "text"
      ? { kind: "layer", layer: parseLayer(el) } as const
      : { kind: "opaque", html: opaque(el.outerHTML) } as const,
  );
  return {
    viewBox: root.getAttribute("viewBox") ?? TYPE_VIEWBOX[type],
    rootAttrs: attrPairs(root, ["xmlns", "viewBox"]),
    nodes: nodes.length ? nodes : starterScene(type).nodes,
  };
}

function layerAttrs(l: Layer): string {
  const attrs: Record<string, string> = { ...l.rest, x: String(l.x), y: String(l.y), fill: l.fill };
  if (l.type === "rect") {
    attrs.width = String(l.width ?? 0);
    attrs.height = String(l.height ?? 0);
    if (l.stroke && l.stroke !== "none") {
      attrs.stroke = l.stroke;
      attrs["stroke-width"] = String(l.strokeWidth ?? 4);
    }
  } else {
    attrs["font-size"] = "48";
    attrs["font-family"] = "sans-serif";
  }
  if (l.hidden) attrs.display = "none";
  return Object.entries(attrs)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(" ");
}

export function serializeScene(scene: Scene, viewBox: string): string {
  const body = scene.nodes
    .map((node) =>
      node.kind === "opaque"
        ? node.html
        : node.layer.type === "rect"
          ? `<rect ${layerAttrs(node.layer)}/>`
          : `<text ${layerAttrs(node.layer)}>${esc(node.layer.text ?? "")}</text>`,
    )
    .join("");
  const root = Object.entries({ xmlns: "http://www.w3.org/2000/svg", ...scene.rootAttrs, viewBox })
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(" ");
  return `<svg ${root}>${body}</svg>`;
}

/** Camadas editaveis da cena, na ordem em que aparecem no arquivo. */
export function layersOf(scene: Scene): Layer[] {
  return scene.nodes.flatMap((n) => (n.kind === "layer" ? [n.layer] : []));
}
