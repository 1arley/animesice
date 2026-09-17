"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";

const blank = {
  key: "BACK_",
  name: "",
  description: "",
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050"><rect width="750" height="1050" fill="#142d4c"/><path d="M0 0h750v1050H0z" fill="none" stroke="#8de7ff" stroke-width="18"/></svg>',
  previewUrl: "",
  price: 1200,
  status: "DRAFT",
};

export default function AdminCapasPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [layers, setLayers] = useState<
    Array<{
      id: string;
      type: "rect" | "text";
      x: number;
      y: number;
      width?: number;
      height?: number;
      fill: string;
      text?: string;
      hidden?: boolean;
      locked?: boolean;
    }>
  >([
    {
      id: "bg",
      type: "rect",
      x: 0,
      y: 0,
      width: 750,
      height: 1050,
      fill: "#142d4c",
    },
  ]);
  const [selected, setSelected] = useState("bg");
  function serialize(next = layers) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1050">${next
      .filter((l) => !l.hidden)
      .map((l) => (l.type === "rect" ? `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="${l.fill}"/>` : `<text x="${l.x}" y="${l.y}" fill="${l.fill}" font-size="48" font-family="sans-serif">${(l.text ?? "").replace(/[<&>]/g, "")}</text>`))
      .join("")}</svg>`;
  }
  function updateLayer(patch: Partial<(typeof layers)[number]>) {
    const next = layers.map((l) => (l.id === selected ? { ...l, ...patch } : l));
    setLayers(next);
    setForm((f) => ({ ...f, svg: serialize(next) }));
  }
  function addLayer(type: "rect" | "text") {
    const layer =
      type === "rect"
        ? {
            id: crypto.randomUUID(),
            type,
            x: 50,
            y: 50,
            width: 650,
            height: 120,
            fill: "#8de7ff",
          }
        : {
            id: crypto.randomUUID(),
            type,
            x: 80,
            y: 180,
            fill: "#ffffff",
            text: "Nova camada",
          };
    const next = [...layers, layer] as typeof layers;
    setLayers(next);
    setSelected(layer.id);
    setForm((f) => ({ ...f, svg: serialize(next) }));
  }
  const load = () =>
    api
      .adminCardBacks()
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar capas."));
  useEffect(() => {
    void load();
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      editing ? await api.adminUpdateCardBack(editing, form) : await api.adminCreateCardBack(form);
      setForm(blank);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar capa.");
    }
  }
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-display-xl text-snow">Editor de capas</h1>
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
          <div className="grid grid-cols-2 gap-3">
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
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                }}
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
                setLayers(next);
                setSelected(next[0]?.id ?? "");
                setForm((f) => ({ ...f, svg: serialize(next) }));
              }}
            >
              Excluir camada
            </button>
          </div>
          <div className="grid gap-2">
            {layers.map((l) => (
              <button type="button" key={l.id} onClick={() => setSelected(l.id)} className={`border p-2 text-left ${selected === l.id ? "border-ice" : "border-hairline"}`}>
                {l.type === "text" ? l.text : "Forma"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-caption text-mist">
              X
              <input className="field" type="number" value={layers.find((l) => l.id === selected)?.x ?? 0} onChange={(e) => updateLayer({ x: Number(e.target.value) })} />
            </label>
            <label className="text-caption text-mist">
              Y
              <input className="field" type="number" value={layers.find((l) => l.id === selected)?.y ?? 0} onChange={(e) => updateLayer({ y: Number(e.target.value) })} />
            </label>
            <label className="text-caption text-mist">
              Cor
              <input className="field h-10" type="color" value={layers.find((l) => l.id === selected)?.fill ?? "#ffffff"} onChange={(e) => updateLayer({ fill: e.target.value })} />
            </label>
          </div>
          <textarea className="field min-h-40 font-mono text-xs" aria-label="SVG avançado" value={form.svg} onChange={(e) => setForm({ ...form, svg: e.target.value })} />
          <div className="flex gap-2">
            <button className="btn-ice px-4 py-3" type="submit">
              {editing ? "Salvar versão" : "Criar capa"}
            </button>
            {editing && (
              <button
                className="btn-ghost px-4 py-3"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
        <aside>
          <h2 className="font-display text-body-lg text-snow">Preview</h2>
          <div className="relative mt-3 aspect-[5/7] overflow-hidden border border-hairline bg-ink">
            <Image fill unoptimized className="object-contain" alt="Preview da capa" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(form.svg.replace(/<script[\s\S]*?<\/script>/gi, ""))}`} />
          </div>
          <p className="mt-2 text-caption text-mist">Selecione camada para ajustar posição e cor.</p>
        </aside>
      </div>
      <section className="mt-8">
        <h2 className="font-display text-body-lg text-snow">Capas salvas</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              className="border border-hairline bg-panel p-3 text-left"
              onClick={() => {
                setEditing(item.id);
                setForm({
                  ...item,
                  description: item.description ?? "",
                  previewUrl: item.previewUrl ?? "",
                });
              }}
            >
              <strong className="text-snow">{item.name}</strong>
              <span className="block text-caption text-mist">
                {item.status} · {item.price} Crystals
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
