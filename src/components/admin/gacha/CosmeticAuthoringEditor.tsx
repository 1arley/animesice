"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import {
  ART_PLATE,
  TYPE_VIEWBOX,
  DEFAULT_VIEWBOX,
  auditCosmetic,
  largestPlate,
  parseViewBox,
  artWindow,
  svgDataUrl,
  type AuditItem,
  type AuditLevel,
  type CosmeticType,
} from "@/lib/cosmetic-svg";
import {
  layersOf,
  parseScene,
  serializeScene,
  starterScene,
  type Layer,
  type Scene,
} from "@/lib/cosmetic-svg-authoring";

const keyPrefixOf = (type: CosmeticType) =>
  type === "BACK" ? "BACK_" : type === "FRAME" ? "FRAME_" : "DESTAQUE_";

const blankOf = (type: CosmeticType) => {
  const starter = starterScene(type);
  return {
    key: keyPrefixOf(type),
    name: "",
    description: "",
    type,
    svg: serializeScene(starter, starter.viewBox),
    previewUrl: "",
    price: type === "BACK" ? 1200 : type === "FRAME" ? 2000 : 3000,
    status: "PUBLISHED",
  };
};

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
  const plate = type === "BACK" ? largestPlate(svg) : null;
  const covers = plate ? plate.x <= vb.x && plate.y <= vb.y && plate.x + plate.w >= vb.x + vb.w && plate.y + plate.h >= vb.y + vb.h : false;
  const label = type === "BACK" ? "Prévia da capa" : type === "FRAME" ? "Prévia da moldura" : "Prévia do destaque";
  return (
    <div
      role="img"
      aria-label={`${label} sobre a arte de referência`}
      className="relative mx-auto w-full max-w-[260px]"
      style={{ aspectRatio: type === "BACK" ? "3 / 4" : `${vb.w} / ${vb.h}` }}
    >
      <div className="absolute overflow-hidden" style={win}>
        <Image src={svgDataUrl(ART_PLATE)} alt="" fill unoptimized aria-hidden className="object-cover" />
      </div>
      {/* Contorno do plano de fundo real: quando a arte foi desenhada num
          canvas menor que o viewBox o navegador a estica ate preencher a caixa e
          a faixa vazia some da vista. O contorno expoe a faixa. */}
      {guides && plate && !covers && (
        <div
          className="pointer-events-none absolute border-2 border-signal"
          style={{
            left: `${((plate.x - vb.x) / vb.w) * 100}%`,
            top: `${((plate.y - vb.y) / vb.h) * 100}%`,
            width: `${(plate.w / vb.w) * 100}%`,
            height: `${(plate.h / vb.h) * 100}%`,
          }}
          aria-hidden
        />
      )}
      {guides && (
        <div className="pointer-events-none absolute border border-dashed border-ice/80" style={win} aria-hidden />
      )}
      {/* SVG fica em documento de imagem inerte, sem execucao no DOM. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={svgDataUrl(svg)} alt="" aria-hidden className="absolute inset-0 h-full w-full" />
    </div>
  );
}

const AUDIT_STYLE: Record<AuditLevel, { mark: string; cls: string }> = {
  ok: { mark: "✓", cls: "text-mist-soft" },
  aviso: { mark: "!", cls: "text-amber-300" },
  erro: { mark: "×", cls: "text-signal" },
};

/**
 * Padrao de autoria como checklist vivo. Cada regra e conferida contra o SVG em
 * edicao e vem com o motivo pelo qual ela existe, entao quem cria a capa nao
 * precisa saber de memoria a medida do slot nem o que acontece se furar a regra.
 * O rotulo tambem e o que o teste automatizado exige, entao dica e contrato nao
 * divergem quando o contrato muda.
 */
function StandardChecklist({ items, idSuffix }: { items: AuditItem[]; idSuffix: string }) {
  const worst: AuditLevel = items.some((i) => i.level === "erro")
    ? "erro"
    : items.some((i) => i.level === "aviso")
      ? "aviso"
      : "ok";
  return (
    <section aria-labelledby={`${idSuffix}-padrao`} className="mt-4 border border-hairline bg-ink p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id={`${idSuffix}-padrao`} className="font-display text-sm text-snow">Padrão do cosmético</h3>
        <span aria-hidden className={`font-mono text-caption ${AUDIT_STYLE[worst].cls}`}>{AUDIT_STYLE[worst].mark}</span>
      </div>
      <ul className="mt-2 grid gap-2">
        {items.map((item) => (
          <li key={item.rule} data-level={item.level} className="border-l-2 border-hairline pl-2">
            <p className={`text-caption font-medium ${AUDIT_STYLE[item.level].cls}`}>
              <span aria-hidden className="mr-1">{AUDIT_STYLE[item.level].mark}</span>
              {item.rule}
            </p>
            {item.got && <p className="font-mono text-caption text-mist-soft">{item.got}</p>}
            <p className="text-caption text-mist">{item.why}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CosmeticAuthoringEditor({
  type: defaultType,
  typeLabel,
}: {
  type: CosmeticType;
  typeLabel: string;
}) {
  const blank = blankOf(defaultType);

  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [scene, setScene] = useState<Scene>(() => starterScene(defaultType));
  const [selected, setSelected] = useState("");
  const [guides, setGuides] = useState(true);
  const layers = useMemo(() => layersOf(scene), [scene]);
  const active = layers.find((l) => l.id === selected) ?? layers[0];

  // form.svg e a fonte da verdade do viewBox: edicao manual no textarea
  // tambem move o canvas do preview, sem estado duplicado para dessincronizar.
  const viewBox = useMemo(
    () => parseViewBox(form.svg, TYPE_VIEWBOX[form.type] ?? DEFAULT_VIEWBOX),
    [form.svg, form.type],
  );

  // Regras do padrao conferidas contra o rascunho atual: o painel mostra o que
  // o SVG mede agora, nao uma lista generica que o autor precisa interpretar.
  const audit = useMemo(() => auditCosmetic(form.svg ?? "", form.type), [form.svg, form.type]);

  function sync(next: Scene) {
    setScene(next);
    setForm((f) => {
      // Fallback por tipo: um FRAME sem viewBox no textarea nao pode herdar
      // o viewBox de capa no proximo toque de camada.
      const vb = parseViewBox(f.svg, TYPE_VIEWBOX[f.type] ?? DEFAULT_VIEWBOX);
      return { ...f, svg: serializeScene(next, `${vb.x} ${vb.y} ${vb.w} ${vb.h}`) };
    });
  }
  function updateLayer(patch: Partial<Layer>) {
    sync({
      ...scene,
      nodes: scene.nodes.map((n) =>
        n.kind === "layer" && n.layer.id === active?.id ? { ...n, layer: { ...n.layer, ...patch } } : n,
      ),
    });
  }
  function addLayer(type: "rect" | "text") {
    const layer: Layer =
      type === "rect"
        ? { id: crypto.randomUUID(), type, x: 50, y: 50, width: 650, height: 120, fill: "#8de7ff", rest: {} }
        : { id: crypto.randomUUID(), type, x: 80, y: 180, fill: "#ffffff", text: "Nova camada", rest: {} };
    // No fim da cena: uma camada nova e o topo do desenho, como no paint order.
    sync({ ...scene, nodes: [...scene.nodes, { kind: "layer", layer }] });
    setSelected(layer.id);
  }
  function changeType(type: CosmeticType) {
    const starter = starterScene(type);
    setForm((f) => ({
      ...f,
      type,
      key: `${keyPrefixOf(type)}${f.key.replace(/^(BACK_|FRAME_|DESTAQUE_)/, "")}`,
      svg: serializeScene(starter, starter.viewBox),
    }));
    setScene(starter);
    setSelected(layersOf(starter)[0]?.id ?? "");
  }
  function resetViewBox() {
    const vb = TYPE_VIEWBOX[form.type] ?? DEFAULT_VIEWBOX;
    const next = form.svg.replace(/viewBox\s*=\s*(["'])[^"']*\1/, `viewBox="${vb}"`);
    setForm((f) => ({ ...f, svg: next }));
  }
  function load() {
    return api
      .adminCardBacks()
      .then((data) => setItems(data.filter((i: any) => i.type === defaultType)))
      .catch((e) => setError(e instanceof ApiError ? e.message : `Erro ao carregar ${typeLabel.toLowerCase()}.`));
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function startEditing(item: any) {
    setEditing(item.id);
    const { id: _id, createdAt: _c, updatedAt: _u, createdById: _cb, version: _v, ...fields } = item;
    const type = (fields.type ?? defaultType) as CosmeticType;
    setForm({ ...fields, type, svg: fields.svg ?? "", description: fields.description ?? "", previewUrl: fields.previewUrl ?? "" });
    const parsed = parseScene(item.svg ?? "", type);
    setScene(parsed);
    setSelected(layersOf(parsed)[0]?.id ?? "");
  }
  function cancelEditing() {
    const starter = starterScene(defaultType);
    setEditing(null);
    setForm(blank);
    setScene(starter);
    setSelected(layersOf(starter)[0]?.id ?? "");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      editing ? await api.adminUpdateCardBack(editing, form) : await api.adminCreateCardBack(form);
      cancelEditing();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `Erro ao salvar ${typeLabel.toLowerCase()}.`);
    }
  }

  return (
    <div>
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
          <textarea className="field min-h-96 font-mono text-xs" required aria-label={`SVG de ${typeLabel.toLowerCase()}`} value={form.svg} onChange={(e) => setForm({ ...form, svg: e.target.value })} />
          <div className="flex gap-2">
            <button className="btn-ice px-4 py-3" type="submit">
              {editing ? "Salvar versão" : `Criar ${typeLabel.toLowerCase()}`}
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
                updateLayer({ hidden: !active?.hidden })
              }
            >
              Mostrar/ocultar
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-2"
              onClick={() => {
                const nodes = scene.nodes.filter((n) => n.kind !== "layer" || n.layer.id !== active?.id);
                sync({ ...scene, nodes });
                setSelected(layersOf({ ...scene, nodes })[0]?.id ?? "");
              }}
            >
              Excluir camada
            </button>
          </div>
          <div className="grid gap-2">
            {layers.map((l) => (
              <button type="button" key={l.id} onClick={() => setSelected(l.id)} aria-pressed={active?.id === l.id} className={`border p-2 text-left ${active?.id === l.id ? "border-ice" : "border-hairline"}`}>
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
              : form.type === "FRAME"
                ? "Moldura estática dentro da face; preserve o centro e evite as áreas dos selos."
                : "Aura externa: desenhe na sangria fora da área tracejada. A face cobre o centro e a moldura fica por cima."}
          </p>
          <p className="mt-1 text-caption text-mist">Selecione camada para ajustar posição, tamanho e cor.</p>
          <StandardChecklist items={audit} idSuffix={defaultType.toLowerCase()} />
          <details className="mt-3 border border-hairline bg-ink p-3">
            <summary className="cursor-pointer text-caption text-snow">Estrutura padrão deste cosmético</summary>
            <p className="mt-2 text-caption text-mist">
              {form.type === "BACK"
                ? "BACK usa viewBox 0 0 750 1000 e um fundo opaco cobrindo todo o canvas."
                : form.type === "FRAME"
                  ? "FRAME usa viewBox -30 -30 810 1060. Faça uma borda ornamental estática dentro da janela tracejada, deixe o centro transparente e mantenha os selos livres."
                  : "HIGHLIGHT usa viewBox -60 -60 870 1120. Coloque brilho e partículas na sangria externa, fora da janela tracejada; não desenhe uma segunda moldura sobre o retrato, pois a face cobre essa área no runtime."}
            </p>
          </details>
        </aside>
      </div>
      <section className="mt-8">
        <h2 className="font-display text-body-lg text-snow">{typeLabel} salvos</h2>
        <p className="mt-1 text-caption text-mist">
          Clique para editar. Salve com status DRAFT para experimentar sem publicar; só PUBLISHED aparece no catálogo.
        </p>
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
