"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import {
  ART_PLATE,
  CARD_ART as ART,
  BLEED,
  TYPE_VIEWBOX,
  DEFAULT_VIEWBOX,
  parseViewBox,
  artWindow,
  svgDataUrl,
  type CosmeticType,
} from "@/lib/cosmetic-svg";

type Layer = {
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
};

const blank = {
  key: "BACK_",
  name: "",
  description: "",
  type: "BACK" as CosmeticType,
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1000"><rect width="750" height="1000" fill="#142d4c"/></svg>',
  previewUrl: "",
  price: 1200,
  status: "PUBLISHED",
};

const DEFAULT_LAYERS: Layer[] = [
  { id: "bg", type: "rect", x: 0, y: 0, width: ART.w, height: ART.h, fill: "#142d4c" },
];

/** Bandas de moldura: 4 retangulos fora da janela da arte, sem cobrir a arte. */
function starterLayers(type: CosmeticType): { viewBox: string; layers: Layer[] } {
  const band = (x: number, y: number, width: number, height: number, fill: string): Layer => ({
    id: crypto.randomUUID(),
    type: "rect",
    x,
    y,
    width,
    height,
    fill,
  });
  if (type === "FRAME") {
    return {
      viewBox: TYPE_VIEWBOX.FRAME,
      layers: [
        band(-BLEED, -BLEED, ART.w + BLEED * 2, BLEED, "#142d4c"),
        band(-BLEED, ART.h, ART.w + BLEED * 2, BLEED, "#142d4c"),
        band(-BLEED, 0, BLEED, ART.h, "#142d4c"),
        band(ART.w, 0, BLEED, ART.h, "#142d4c"),
      ],
    };
  }
  if (type === "HIGHLIGHT") {
    return {
      viewBox: TYPE_VIEWBOX.HIGHLIGHT,
      layers: [{ ...band(24, 24, ART.w - 48, ART.h - 48, "none"), stroke: "#fcd34d", strokeWidth: 10 }],
    };
  }
  return { viewBox: TYPE_VIEWBOX.BACK, layers: DEFAULT_LAYERS };
}

function unescapeXml(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function deserialize(svg: string, type: CosmeticType): { viewBox: string; layers: Layer[]; extra: string } {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.querySelector("svg");
  if (!root) return { ...starterLayers(type), extra: "" };
  const viewBox = root.getAttribute("viewBox") ?? TYPE_VIEWBOX[type];
  const layers: Layer[] = [];
  const extra: string[] = [];
  for (const child of Array.from(root.children)) {
    if (child.tagName === "rect") {
      layers.push({
        id: crypto.randomUUID(),
        type: "rect",
        x: Number(child.getAttribute("x") ?? 0),
        y: Number(child.getAttribute("y") ?? 0),
        width: Number(child.getAttribute("width") ?? 0),
        height: Number(child.getAttribute("height") ?? 0),
        fill: child.getAttribute("fill") ?? "#000000",
        stroke: child.getAttribute("stroke") ?? undefined,
        strokeWidth: child.getAttribute("stroke-width") ? Number(child.getAttribute("stroke-width")) : undefined,
        hidden: child.getAttribute("display") === "none" || undefined,
      });
    } else if (child.tagName === "text") {
      layers.push({
        id: crypto.randomUUID(),
        type: "text",
        x: Number(child.getAttribute("x") ?? 0),
        y: Number(child.getAttribute("y") ?? 0),
        fill: child.getAttribute("fill") ?? "#ffffff",
        text: unescapeXml(child.textContent ?? ""),
        hidden: child.getAttribute("display") === "none" || undefined,
      });
    } else {
      extra.push(child.outerHTML);
    }
  }
  return {
    viewBox,
    layers: layers.length ? layers : starterLayers(type).layers,
    extra: extra.join(""),
  };
}

function serialize(layers: Layer[], extra: string, viewBox: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${extra}${layers
    .map((l) => {
      const hide = l.hidden ? ' display="none"' : "";
      if (l.type === "rect") {
        const stroke = l.stroke && l.stroke !== "none" ? ` stroke="${l.stroke}" stroke-width="${l.strokeWidth ?? 4}"` : "";
        return `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="${l.fill}"${stroke}${hide}/>`;
      }
      return `<text x="${l.x}" y="${l.y}" fill="${l.fill}" font-size="48" font-family="sans-serif"${hide}>${(l.text ?? "").replace(/[<&>]/g, "")}</text>`;
    })
    .join("")}</svg>`;
}

/**
 * Previa de autoria. A arte de referencia fica ATRAS do SVG para que moldura e
 * destaque possam ser alinhados contra a janela real do cartao — sem ela, um
 * frame transparente aparece como uma caixa vazia e nada pode ser conferido.
 * A caixa externa usa o aspect do viewBox, entao o SVG mapeia 1:1 e nao sofre
 * com object-cover (que cortava ~46% da altura de um canvas 5/7).
 */
function CosmeticPreview({ svg, type, guides }: { svg: string; type: CosmeticType; guides: boolean }) {
  const vb = parseViewBox(svg, TYPE_VIEWBOX[type] ?? DEFAULT_VIEWBOX);
  const win = artWindow(vb);
  const label = type === "BACK" ? "Prévia da capa" : type === "FRAME" ? "Prévia da moldura" : "Prévia do destaque";
  return (
    <div
      role="img"
      aria-label={`${label} sobre a arte de referência`}
      className="relative mx-auto w-full max-w-[260px]"
      style={{ aspectRatio: `${vb.w} / ${vb.h}` }}
    >
      <div className="absolute overflow-hidden" style={win}>
        <Image src={svgDataUrl(ART_PLATE)} alt="" fill unoptimized aria-hidden className="object-cover" />
      </div>
      {guides && (
        <div className="pointer-events-none absolute border border-dashed border-ice/80" style={win} aria-hidden />
      )}
      {/* SVG fica em documento de imagem inerte, sem execucao no DOM. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={svgDataUrl(svg)} alt="" aria-hidden className="absolute inset-0 h-full w-full" />
    </div>
  );
}

export default function AdminCapasPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);
  const [extra, setExtra] = useState("");
  const [selected, setSelected] = useState("bg");
  const [guides, setGuides] = useState(true);
  const active = layers.find((l) => l.id === selected);

  // form.svg e a fonte da verdade do viewBox: edicao manual no textarea
  // tambem move o canvas do preview, sem estado duplicado para dessincronizar.
  const viewBox = useMemo(
    () => parseViewBox(form.svg, TYPE_VIEWBOX[form.type] ?? DEFAULT_VIEWBOX),
    [form.svg, form.type],
  );

  function sync(next: Layer[]) {
    setLayers(next);
    setForm((f) => {
      // Fallback por tipo: um FRAME sem viewBox no textarea nao pode herdar
      // o viewBox de capa no proximo toque de camada.
      const vb = parseViewBox(f.svg, TYPE_VIEWBOX[f.type] ?? DEFAULT_VIEWBOX);
      return { ...f, svg: serialize(next, extra, `${vb.x} ${vb.y} ${vb.w} ${vb.h}`) };
    });
  }
  function updateLayer(patch: Partial<Layer>) {
    sync(layers.map((l) => (l.id === selected ? { ...l, ...patch } : l)));
  }
  function addLayer(type: "rect" | "text") {
    const layer: Layer =
      type === "rect"
        ? { id: crypto.randomUUID(), type, x: 50, y: 50, width: 650, height: 120, fill: "#8de7ff" }
        : { id: crypto.randomUUID(), type, x: 80, y: 180, fill: "#ffffff", text: "Nova camada" };
    sync([...layers, layer]);
    setSelected(layer.id);
  }
  function changeType(type: CosmeticType) {
    const starter = starterLayers(type);
    setForm((f) => ({ ...f, type, svg: serialize(starter.layers, "", starter.viewBox) }));
    setLayers(starter.layers);
    setExtra("");
    setSelected(starter.layers[0]?.id ?? "");
  }
  function resetViewBox() {
    const vb = TYPE_VIEWBOX[form.type] ?? DEFAULT_VIEWBOX;
    const next = form.svg.replace(/viewBox\s*=\s*(["'])[^"']*\1/, `viewBox="${vb}"`);
    setForm((f) => ({ ...f, svg: next }));
  }
  const load = () =>
    api
      .adminCardBacks()
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar capas."));
  useEffect(() => {
    void load();
  }, []);
  function startEditing(item: any) {
    setEditing(item.id);
    const { id: _id, createdAt: _c, updatedAt: _u, createdById: _cb, version: _v, ...fields } = item;
    const type = (fields.type ?? "BACK") as CosmeticType;
    setForm({ ...fields, type, svg: fields.svg ?? "", description: fields.description ?? "", previewUrl: fields.previewUrl ?? "" });
    const parsed = deserialize(item.svg ?? "", type);
    setLayers(parsed.layers);
    setExtra(parsed.extra);
    setSelected(parsed.layers[0]?.id ?? "");
  }
  function cancelEditing() {
    setEditing(null);
    setForm(blank);
    setLayers(DEFAULT_LAYERS);
    setExtra("");
    setSelected("bg");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      editing ? await api.adminUpdateCardBack(editing, form) : await api.adminCreateCardBack(form);
      cancelEditing();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar capa.");
    }
  }
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-display-xl text-snow">Cosméticos</h1>
      {error && (
        <p role="alert" className="mt-3 text-signal">
          {error}
        </p>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={save} className="grid gap-3 border border-hairline bg-panel p-4">
          <input className="field" required placeholder="Chave" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          <input className="field" required placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="field" placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <select className="field" value={form.type} onChange={(e) => changeType(e.target.value as CosmeticType)}>
              <option value="BACK">Verso (capa)</option>
              <option value="FRAME">Moldura</option>
              <option value="HIGHLIGHT">Destaque</option>
            </select>
            <input className="field" type="number" min="0" placeholder="Preço" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
            <select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>DRAFT</option>
              <option>REVIEW</option>
              <option>PUBLISHED</option>
              <option>ARCHIVED</option>
            </select>
          </div>
          <textarea className="field min-h-96 font-mono text-xs" required aria-label="SVG da capa" value={form.svg} onChange={(e) => setForm({ ...form, svg: e.target.value })} />
          <div className="flex gap-2">
            <button className="btn-ice px-4 py-3" type="submit">
              {editing ? "Salvar versão" : "Criar capa"}
            </button>
            {editing && (
              <button
                className="btn-ghost px-4 py-3"
                type="button"
                onClick={cancelEditing}
              >
                Cancelar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost px-3 py-2" onClick={() => addLayer("rect")}>
              + Forma
            </button>
            <button type="button" className="btn-ghost px-3 py-2" onClick={() => addLayer("text")}>
              + Texto
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-2"
              onClick={() =>
                updateLayer({
                  hidden: !layers.find((l) => l.id === selected)?.hidden,
                })
              }
            >
              Mostrar/ocultar
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-2"
              onClick={() => {
                const next = layers.filter((l) => l.id !== selected);
                sync(next);
                setSelected(next[0]?.id ?? "");
              }}
            >
              Excluir camada
            </button>
          </div>
          <div className="grid gap-2">
            {layers.map((l) => (
              <button type="button" key={l.id} onClick={() => setSelected(l.id)} aria-pressed={selected === l.id} className={`border p-2 text-left ${selected === l.id ? "border-ice" : "border-hairline"}`}>
                <span className="flex items-center gap-2">
                  {l.hidden && <span className="text-caption text-mist">(oculta)</span>}
                  {l.type === "text" ? l.text : "Forma"}
                </span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-caption text-mist">
              X
              <input className="field" type="number" value={active?.x ?? 0} onChange={(e) => updateLayer({ x: Number(e.target.value) })} />
            </label>
            <label className="text-caption text-mist">
              Y
              <input className="field" type="number" value={active?.y ?? 0} onChange={(e) => updateLayer({ y: Number(e.target.value) })} />
            </label>
            {active?.type === "rect" && (
              <>
                <label className="text-caption text-mist">
                  Largura
                  <input className="field" type="number" value={active.width ?? 0} onChange={(e) => updateLayer({ width: Number(e.target.value) })} />
                </label>
                <label className="text-caption text-mist">
                  Altura
                  <input className="field" type="number" value={active.height ?? 0} onChange={(e) => updateLayer({ height: Number(e.target.value) })} />
                </label>
                <label className="text-caption text-mist">
                  Contorno
                  <input
                    className="field h-10"
                    type="color"
                    value={active.stroke && active.stroke !== "none" ? active.stroke : "#8de7ff"}
                    onChange={(e) => updateLayer({ stroke: e.target.value, strokeWidth: active.strokeWidth ?? 4 })}
                  />
                </label>
                <label className="flex items-center gap-2 pt-6 text-caption text-mist">
                  <input type="checkbox" checked={Boolean(active.stroke && active.stroke !== "none")} onChange={(e) => updateLayer({ stroke: e.target.checked ? "#8de7ff" : "none" })} />
                  Usar contorno
                </label>
                {active.stroke && active.stroke !== "none" && (
                  <label className="text-caption text-mist">
                    Espessura
                    <input className="field" type="number" min="0" value={active.strokeWidth ?? 4} onChange={(e) => updateLayer({ strokeWidth: Number(e.target.value) })} />
                  </label>
                )}
              </>
            )}
            <label className="text-caption text-mist">
              Cor
              <input className="field h-10" type="color" value={active?.fill ?? "#ffffff"} onChange={(e) => updateLayer({ fill: e.target.value })} />
            </label>
          </div>
        </form>
        <aside>
          <h2 className="font-display text-body-lg text-snow">Preview</h2>
          <div className="mt-3 border border-hairline bg-ink p-3">
            <CosmeticPreview svg={form.svg ?? ""} type={form.type} guides={guides} />
          </div>
          <p className="mt-3 font-mono text-caption text-mist-soft">
            viewBox {viewBox.x} {viewBox.y} {viewBox.w} {viewBox.h}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" aria-pressed={guides} onClick={() => setGuides((g) => !g)} className="btn-ghost px-3 py-2 text-caption">
              {guides ? "Ocultar guias" : "Mostrar guias"}
            </button>
            <button type="button" onClick={resetViewBox} className="btn-ghost px-3 py-2 text-caption">
              viewBox padrão
            </button>
          </div>
          <p className="mt-2 text-caption text-mist">
            {form.type === "BACK"
              ? "Arte de referência atrás: a capa é opaca e cobre tudo."
              : "A moldura é desenhada sobre a arte. A área tracejada é a janela do cartão — o anel deve ficar fora dela."}
          </p>
          <p className="mt-1 text-caption text-mist">Selecione camada para ajustar posição, tamanho e cor.</p>
        </aside>
      </div>
      <section className="mt-8">
        <h2 className="font-display text-body-lg text-snow">Capas salvas</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              className="border border-hairline bg-panel p-3 text-left"
              onClick={() => startEditing(item)}
            >
              <strong className="text-snow">{item.name}</strong>
              <span className="block text-caption text-mist">
                {item.type} · {item.status} · {item.price} Crystals
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
