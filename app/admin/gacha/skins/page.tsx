"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { safeImageSrc } from "@/lib/url";
import { useToast } from "@/components/common/ToastProvider";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { SearchField } from "@/components/ui/SearchField";
import type { AdminGachaCard, AdminGachaSkin } from "@/types";

const PAGE_SIZE = 48;
const SKIN_RARITIES = [
  ["COMMON", "Comum"],
  ["RARE", "Rara"],
  ["EPIC", "Épica"],
  ["LEGENDARY", "Lendária"],
] as const;
type SkinForm = {
  name: string;
  imageUrl: string;
  sourceUrl: string;
  cardId: string;
  rarity: string;
  active: boolean;
};
const EMPTY_FORM: SkinForm = {
  name: "",
  imageUrl: "",
  sourceUrl: "",
  cardId: "",
  rarity: "COMMON",
  active: true,
};

export default function AdminGachaSkinsPage() {
  const { toast } = useToast();
  const [skins, setSkins] = useState<AdminGachaSkin[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SkinForm>(EMPTY_FORM);
  const [cardQuery, setCardQuery] = useState("");
  const [cardResults, setCardResults] = useState<AdminGachaCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [busySkinId, setBusySkinId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLDialogElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.adminListSkins(
        page,
        PAGE_SIZE,
        search,
        filter === "all" ? undefined : filter === "active",
      );
      setSkins(result.data);
      setTotal(result.meta.total);
      setTotalPages(Math.max(1, result.meta.totalPages));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar skins.");
    } finally {
      setLoading(false);
    }
  }, [filter, page, search]);

  useEffect(() => void load(), [load]);

  useEffect(() => {
    if (cardQuery.trim().length < 2) {
      setCardResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api.adminListGachaCards(1, 12, cardQuery.trim())
        .then((result) => setCardResults(result.data))
        .catch(() => setCardResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [cardQuery]);

  useEffect(() => {
    if (editing && editorRef.current && !editorRef.current.open) {
      editorRef.current.showModal();
    }
  }, [editing]);

  function startEdit(skin: AdminGachaSkin) {
    setEditing(skin.id);
    setError("");
    setForm({
      name: skin.name,
      imageUrl: skin.imageUrl,
      sourceUrl: skin.sourceUrl ?? "",
      cardId: skin.cardId ?? "",
      rarity: skin.rarity,
      active: skin.active,
    });
    setCardQuery(skin.card?.name ?? "");
  }

  function resetForm() {
    if (editorRef.current?.open) editorRef.current.close();
    setEditing(null);
    setForm(EMPTY_FORM);
    setCardQuery("");
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name.trim(),
        imageUrl: form.imageUrl.trim(),
        sourceUrl: form.sourceUrl.trim() || null,
        cardId: form.cardId || null,
        active: form.active,
      };
      if (editing) {
        const rarity = SKIN_RARITIES.find(([value]) => value === form.rarity)?.[0];
        await api.adminUpdateSkin(editing, { ...body, rarity });
      } else await api.adminCreateSkin(body);
      toast(editing ? "Skin atualizada." : "Skin criada.", "success");
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar skin.");
    } finally {
      setSaving(false);
    }
  }

  async function archive(skin: AdminGachaSkin) {
    if (saving || busySkinId) return;
    if (!window.confirm(`Desativar “${skin.name}”? Cópias já adquiridas serão preservadas.`)) return;
    setError("");
    setBusySkinId(skin.id);
    try {
      await api.adminUpdateSkin(skin.id, { active: false });
      toast("Skin desativada; as cópias existentes foram preservadas.", "success");
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao desativar skin.");
    } finally {
      setBusySkinId(null);
    }
  }

  async function remove(skin: AdminGachaSkin) {
    const owners = skin._count?.owners ?? 0;
    const buyOrders = skin._count?.buyOrders ?? 0;
    if (skin.active || owners > 0 || buyOrders > 0 || saving || busySkinId) return;
    if (!window.confirm(`Excluir “${skin.name}” permanentemente? Esta ação não pode ser desfeita.`)) return;
    setError("");
    setBusySkinId(skin.id);
    try {
      await api.adminDeleteSkin(skin.id);
      toast("Skin excluída.", "success");
      if (editing === skin.id) resetForm();
      if (skins.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro ao excluir skin.");
    } finally {
      setBusySkinId(null);
    }
  }

  const selectedCard = cardResults.find((card) => card.id === form.cardId);
  const skinForm = (isEditing: boolean) => (
    <form onSubmit={(event) => void save(event)} className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="grid gap-1 text-body-sm text-mist">
        Nome da skin
        <input autoFocus={isEditing} required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field-input min-h-11" />
      </label>
      {isEditing && <label className="grid gap-1 text-body-sm text-mist" htmlFor="skin-rarity">
        Raridade
        <select id="skin-rarity" value={SKIN_RARITIES.some(([value]) => value === form.rarity) ? form.rarity : ""} onChange={(e) => setForm({ ...form, rarity: e.target.value })} className="field-input min-h-11">
          {!SKIN_RARITIES.some(([value]) => value === form.rarity) && <option value="">Manter valor atual: {form.rarity}</option>}
          {SKIN_RARITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>}
      <label className="grid gap-1 text-body-sm text-mist">
        URL da imagem (HTTPS)
        <input required type="url" pattern="https://.*" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="field-input min-h-11" />
      </label>
      <label className="grid gap-1 text-body-sm text-mist">
        Fonte da imagem (opcional)
        <input type="url" pattern="https://.*" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} className="field-input min-h-11" />
      </label>
      <div className="grid gap-1 text-body-sm text-mist">
        <label htmlFor="skin-card-search">Carta/personagem (opcional)</label>
        <SearchField
          id="skin-card-search"
          value={cardQuery}
          onChange={(e) => { setCardQuery(e.target.value); setForm({ ...form, cardId: "" }); }}
          placeholder="Buscar por nome da carta"
          containerClassName="w-full"
        />
        {form.cardId && <p className="text-caption text-ice">Vínculo selecionado: {selectedCard?.name ?? cardQuery}</p>}
        {cardResults.length > 0 && !form.cardId && (
          <ul className="max-h-48 overflow-auto border border-hairline bg-void" aria-label="Resultados de cartas">
            {cardResults.map((card) => <li key={card.id}><button type="button" onClick={() => { setForm({ ...form, cardId: card.id }); setCardQuery(card.name); setCardResults([]); }} className="min-h-11 w-full px-3 text-left hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-ice">{card.name}</button></li>)}
          </ul>
        )}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-body-sm text-snow">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-5 w-5 accent-ice" />
        Ativa no catálogo
      </label>
      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <button type="submit" disabled={saving || busySkinId !== null} className="btn-primary min-h-11 px-5">{saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar skin"}</button>
        {isEditing && <button type="button" disabled={saving} onClick={resetForm} className="btn-ghost min-h-11 px-4">Cancelar edição</button>}
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-caption uppercase tracking-[0.18em] text-ice">Gacha / catálogo</p>
          <h1 className="mt-1 font-display text-display-xl text-snow">Skins de personagens</h1>
        </div>
        <Link href="/admin/gacha" className="btn-ghost min-h-11 px-4 py-2">Voltar ao gacha</Link>
      </header>
      <p className="mt-2 max-w-2xl text-body-sm text-mist">
        Cadastre artes alternativas, vincule-as a uma carta e controle quais aparecem no catálogo.
        Desativar preserva as cópias dos jogadores. Só é possível excluir skins desativadas sem cópias ou pedidos de compra associados.
      </p>

      {error && !editing && <p role="alert" className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">{error}</p>}

      {!editing && <section aria-labelledby="skin-form-title" className="mt-6 border border-hairline bg-panel p-4 sm:p-6">
        <h2 id="skin-form-title" className="font-display text-title text-snow">Adicionar skin</h2>
        {skinForm(false)}
      </section>
      }

      {editing && <dialog
        ref={editorRef}
        onClose={resetForm}
        aria-labelledby="skin-editor-title"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto border border-hairline bg-panel p-0 text-snow backdrop:bg-void/80"
      >
        <section className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="skin-editor-title" className="font-display text-title text-snow">Editar skin</h2>
            <button type="button" onClick={resetForm} className="btn-ghost min-h-11 px-4">Fechar</button>
          </div>
          {error && <p role="alert" className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">{error}</p>}
          {skinForm(true)}
        </section>
      </dialog>}

      <section aria-labelledby="skin-list-title" className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="skin-list-title" className="font-display text-title text-snow">Catálogo</h2>
            <p className="mt-1 text-caption text-mist">{loading ? "Carregando skins…" : `${total} resultado${total === 1 ? "" : "s"} · ${skins.length} nesta página`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="skin-search">Buscar skins</label>
            <SearchField
              id="skin-search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nome"
              containerClassName="min-w-0 flex-1"
            />
            <label className="sr-only" htmlFor="skin-status">Estado</label>
            <select id="skin-status" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="field-input min-h-11">
              <option value="all">Todas</option><option value="active">Ativas</option><option value="inactive">Desativadas</option>
            </select>
          </div>
        </div>
        {loading ? <div aria-busy="true" aria-label="Carregando catálogo" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-64 animate-pulse bg-panel" />)}</div> : skins.length === 0 ? (
          <div className="mt-4 border border-hairline p-8 text-center text-body-sm text-mist">
            <p role="status">Nenhuma skin encontrada.</p>
            {(search || filter !== "all") && <button type="button" onClick={() => { setSearch(""); setFilter("all"); setPage(1); }} className="btn-ghost mt-3 min-h-11 px-4">Limpar busca e filtros</button>}
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {skins.map((skin) => <li key={skin.id} className="overflow-hidden border border-hairline bg-panel">
              <div className="relative aspect-[3/4] bg-void">
                {safeImageSrc(skin.imageUrl) ? <Image src={safeImageSrc(skin.imageUrl)!} alt={`Arte de ${skin.name}`} fill unoptimized sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" /> : <span className="flex h-full items-center justify-center text-caption text-mist">Imagem indisponível</span>}
                <span className={`absolute left-2 top-2 px-2 py-1 font-mono text-[10px] uppercase ${skin.active ? "bg-ice text-void" : "bg-void/90 text-mist"}`}>{skin.active ? "Ativa" : "Desativada"}</span>
              </div>
              <div className="p-3">
                <h3 className="truncate font-display text-body-md text-snow" title={skin.name}>{skin.name}</h3>
                <p className="mt-1 truncate text-caption text-mist">{skin.card?.name ?? "Sem personagem vinculado"}</p>
                <p className="mt-1 text-caption text-mist">Raridade: {SKIN_RARITIES.find(([value]) => value === skin.rarity)?.[1] ?? skin.rarity}</p>
                <p className="mt-1 text-caption text-mist">{skin._count?.owners ?? 0} cópias · {skin._count?.buyOrders ?? 0} pedidos de compra</p>
                {!skin.active && ((skin._count?.owners ?? 0) > 0 || (skin._count?.buyOrders ?? 0) > 0) && <p className="mt-1 text-caption text-signal">Não pode excluir: existem cópias ou pedidos associados.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busySkinId !== null || saving} onClick={() => startEdit(skin)} className="btn-ghost min-h-11 flex-1 px-2 text-caption">Editar</button>
                  {skin.active ? (
                    <button type="button" disabled={busySkinId !== null || saving} onClick={() => void archive(skin)} className="min-h-11 border border-signal/40 px-3 text-caption text-signal hover:bg-signal/10 disabled:opacity-50">{busySkinId === skin.id ? "Desativando…" : "Desativar"}</button>
                  ) : (
                    <button type="button" disabled={busySkinId !== null || saving || (skin._count?.owners ?? 0) > 0 || (skin._count?.buyOrders ?? 0) > 0} title={(skin._count?.owners ?? 0) > 0 || (skin._count?.buyOrders ?? 0) > 0 ? "Não é possível excluir: existem cópias ou pedidos de compra associados." : undefined} onClick={() => void remove(skin)} className="min-h-11 border border-signal/40 px-3 text-caption text-signal hover:bg-signal/10 disabled:cursor-not-allowed disabled:opacity-50">{busySkinId === skin.id ? "Excluindo…" : "Excluir"}</button>
                  )}
                </div>
              </div>
            </li>)}
          </ul>
        )}
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          label="Paginação de skins"
          busy={loading}
        />
      </section>
    </div>
  );
}
