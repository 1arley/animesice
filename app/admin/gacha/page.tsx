"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminGachaCard, Anime, GachaPull } from "@/types";

const TIERS = [
  "COMUM",
  "INCOMUM",
  "RARA",
  "EPICA",
  "LENDARIA",
  "MITICA",
  "GALACTICA",
] as const;

const PAGE_SIZE = 48;

export default function AdminGachaPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<AdminGachaCard[]>([]);
  const [cardMeta, setCardMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [cardSearch, setCardSearch] = useState("");
  const [rarity, setRarity] = useState("");
  const [status, setStatus] = useState("");
  const [animeId, setAnimeId] = useState("");
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string; name: string | null; userName: string | null }[]>([]);
  const [userCards, setUserCards] = useState<GachaPull[]>([]);
  const [userCardsMeta, setUserCardsMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [userPage, setUserPage] = useState(1);
  const [userCardsVersion, setUserCardsVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [form, setForm] = useState({ name: "", image: "", imageHidden: false, rarity: "COMUM", animeId: "", reason: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadCards(page = 1, name = cardSearch, rar = rarity, anime = animeId, state = status) {
    try {
      const res = await api.adminListGachaCards(page, PAGE_SIZE, name || undefined, rar || undefined, anime || undefined, state || undefined);
      setCards(res.data);
      setCardMeta({ page: res.meta.page, totalPages: res.meta.totalPages, total: res.meta.total });
    } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao carregar pool."); }
  }

  useEffect(() => {
    api.adminListGachaCards(1, PAGE_SIZE)
      .then(res => {
        setCards(res.data);
        setCardMeta({ page: res.meta.page, totalPages: res.meta.totalPages, total: res.meta.total });
      })
      .catch(e => setError(e instanceof ApiError ? e.message : "Erro ao carregar pool."));
  }, []);

  function onCardSearch(value: string) {
    setCardSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void loadCards(1, value, rarity), 350);
  }

  function onRarityChange(value: string) {
    setRarity(value);
    void loadCards(1, cardSearch, value);
  }

  function gotoCardPage(page: number) {
    void loadCards(page);
  }

  async function searchUsers(value: string) {
    setSearch(value);
    if (value.length < 2) { setUsers([]); return; }
    try { setUsers((await api.adminListUsers(1, 10, value)).data); } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao buscar usuários."); }
  }

  async function searchAnimes(value: string) {
    if (value.length < 2) { setAnimes([]); return; }
    try { setAnimes((await api.adminListAnimes(1, 10, value)).data); } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao buscar animes."); }
  }

  async function saveCard(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        const current = cards.find(card => card.id === editing);
        if (current?.rarity !== form.rarity && !window.confirm("Alterar raridade recalculará todas as cópias sem override. Continuar?")) return;
        await api.adminUpdateGachaCard(editing, form);
      }
      else await api.adminCreateGachaCard(form);
      setForm({ name: "", image: "", imageHidden: false, rarity: "COMUM", animeId: "", reason: "" }); setEditing(null); await loadCards();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao salvar carta."); }
  }

  function loadUserCards(id: string, page = 1) {
    setUserCards([]);
    setUserCardsMeta({ page, totalPages: 1, total: 0 });
    setSelectedUser(id);
    setUserPage(page);
    setUserCardsVersion(v => v + 1);
  }

  useEffect(() => {
    if (!selectedUser) return;
    let cancelled = false;
    setError(null);
    api.adminListUserCards(selectedUser, userPage)
      .then(res => {
        if (cancelled) return;
        setUserCards(res.data);
        setUserCardsMeta({ page: res.meta.page, totalPages: res.meta.totalPages, total: res.meta.total });
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Erro ao carregar cartas.");
      });
    return () => { cancelled = true; };
  }, [selectedUser, userPage, userCardsVersion]);

  async function removeCard(id: string) {
    if (!window.confirm("Excluir carta?")) return;
    try { await api.adminDeleteUserCard(id); setUserCardsVersion(v => v + 1); } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao excluir carta."); }
  }

  async function resetRoll() {
    if (!selectedUser || !window.confirm("Resetar roll de hoje?")) return;
    try { await api.adminResetGachaRoll(selectedUser); } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao resetar roll."); }
  }

  async function grantCard(cardId: string) {
    if (!selectedUser) return;
    try { await api.adminGrantUserCard(selectedUser, cardId); setUserCardsVersion(v => v + 1); } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao conceder carta."); }
  }

  async function setCardValue(card: GachaPull, restore = false) {
    const raw = restore ? null : window.prompt("Novo valor inteiro entre 0 e 1000000", String(card.value));
    if (!restore && raw === null) return;
    const reason = window.prompt("Motivo da alteração (mínimo 10 caracteres)");
    if (!reason) return;
    try { await api.adminSetUserCardValue(card.id, { value: restore ? null : Number(raw), reason }); setUserCardsVersion(v => v + 1); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao ajustar valor."); }
  }

  return <div>
    <h1 className="font-display text-display-xl text-snow">Gacha</h1>
    {error && <div role="alert" className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">{error}</div>}
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="border border-hairline bg-panel p-4">
        <h2 className="font-display text-display-lg text-snow">Pool</h2>
        <form className="mt-4 grid gap-3" onSubmit={saveCard}>
          <input className="field" required placeholder="Personagem" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="field" required type="url" placeholder="Imagem HTTPS" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} />
          <label className="flex items-center gap-2 text-body-sm text-mist"><input type="checkbox" checked={form.imageHidden} onChange={e => setForm({ ...form, imageHidden: e.target.checked })} />Ocultar arte como ???</label>
          <input className="field" required placeholder="Buscar anime" aria-label="Buscar anime" onChange={e => void searchAnimes(e.target.value)} />
          <select className="field" required aria-label="Anime da carta" value={form.animeId} onChange={e => { const a = animes.find(x => x.id === e.target.value); setForm({ ...form, animeId: e.target.value, image: form.image || a?.coverImage || "" }); }}>
            <option value="">Selecione anime</option>
            {animes.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
          <select className="field" value={form.rarity} onChange={e => setForm({ ...form, rarity: e.target.value })}>
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {editing && <input className="field" placeholder="Motivo (obrigatório ao mudar anime ou raridade)" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />}
          <button className="admin-tab w-fit" type="submit">{editing ? "Salvar" : "Criar"}</button>
        </form>
        <div className="mt-4 flex gap-2">
          <input className="field flex-1" placeholder="Buscar personagem" aria-label="Buscar personagem" value={cardSearch} onChange={e => onCardSearch(e.target.value)} />
          <select className="field w-40" value={rarity} onChange={e => onRarityChange(e.target.value)}>
            <option value="">Todas</option>
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="field w-36" aria-label="Filtrar status" value={status} onChange={e => { setStatus(e.target.value); void loadCards(1, cardSearch, rarity, animeId, e.target.value); }}><option value="">Status</option><option value="DRAFT">Rascunho</option><option value="REVIEW">Revisão</option><option value="ACTIVE">Ativa</option><option value="ARCHIVED">Arquivada</option></select>
        </div>
        <p className="mt-2 font-mono text-caption text-mist-soft">{cardMeta.total} cartas · página {cardMeta.page}/{cardMeta.totalPages}</p>
        <div className="mt-2 space-y-2">{cards.map(card => <div className="flex items-center justify-between gap-2 border-b border-hairline py-2" key={card.id}>
          <span className="min-w-0 truncate text-mist">{card.name} <small>{card.rarity} · {card.status}{card.imageHidden ? " · ???" : ""}</small>{(card.anime?.title ?? card.animeTitle) && <small className="block text-mist-soft">{card.anime?.title ?? card.animeTitle}{card.anime?.malId ? ` · MAL ${card.anime.malId}` : ""}</small>}</span>
          <span className="flex flex-none gap-1">
            <button className="admin-tab" onClick={() => { setEditing(card.id); if (card.anime && !animes.some(a => a.id === card.anime!.id)) setAnimes(current => [...current, card.anime as Anime]); setForm({ name: card.name, image: card.image ?? "", imageHidden: card.imageHidden, rarity: card.rarity, animeId: card.animeId ?? "", reason: "" }); }}>Editar</button>
            {user?.role === "SUPERADMIN" && card.status !== "ACTIVE" && <button className="admin-tab" onClick={() => void api.adminPublishGachaCard(card.id).then(() => loadCards()).catch(e => setError(e instanceof ApiError ? e.message : "Erro ao publicar carta."))}>Publicar</button>}
            {user?.role === "SUPERADMIN" && card.status === "ACTIVE" && <button className="admin-tab" onClick={() => void api.adminArchiveGachaCard(card.id).then(() => loadCards()).catch(e => setError(e instanceof ApiError ? e.message : "Erro ao arquivar carta."))}>Arquivar</button>}
            {selectedUser && <button className="admin-tab" onClick={() => void grantCard(card.id)}>Conceder</button>}
          </span>
        </div>)}</div>
        {cardMeta.totalPages > 1 && <div className="mt-3 flex items-center justify-between">
          <button className="admin-tab" disabled={cardMeta.page <= 1} onClick={() => gotoCardPage(cardMeta.page - 1)}>Anterior</button>
          <button className="admin-tab" disabled={cardMeta.page >= cardMeta.totalPages} onClick={() => gotoCardPage(cardMeta.page + 1)}>Próxima</button>
        </div>}
      </div>
      <div className="border border-hairline bg-panel p-4">
        <h2 className="font-display text-display-lg text-snow">Usuário</h2>
        <input className="field mt-4" placeholder="Buscar usuário" value={search} onChange={e => void searchUsers(e.target.value)} />
        <div className="mt-2 space-y-1">{users.map(user => <button className="block w-full p-2 text-left text-mist hover:bg-white/5" key={user.id} onClick={() => void loadUserCards(user.id, 1)}>{user.userName ?? user.name ?? user.email}</button>)}</div>
        {selectedUser && <>
          <div className="mt-4"><button className="admin-tab" onClick={() => void resetRoll()}>Reset roll</button></div>
          <p className="mt-3 font-mono text-caption text-mist-soft">{userCardsMeta.total} cartas · página {userCardsMeta.page}/{userCardsMeta.totalPages}</p>
          <div className="mt-2 space-y-2">{userCards.map(card => <div className="flex items-center justify-between border-b border-hairline py-2" key={card.id}>
            <span className="min-w-0 truncate text-mist">{card.card.name} · {card.card.rarity} · {card.value} pts{card.valueOverride !== null && card.valueOverride !== undefined ? " · override" : ""}</span>
            <span className="flex flex-none gap-1">{user?.role === "SUPERADMIN" && <><button className="admin-tab" onClick={() => void setCardValue(card)}>Valor</button>{card.valueOverride !== null && card.valueOverride !== undefined && <button className="admin-tab" onClick={() => void setCardValue(card, true)}>Restaurar</button>}</>}<button className="admin-tab" onClick={() => void removeCard(card.id)}>Excluir</button></span>
          </div>)}</div>
          {userCardsMeta.totalPages > 1 && <div className="mt-3 flex items-center justify-between">
            <button className="admin-tab" disabled={userCardsMeta.page <= 1} onClick={() => void loadUserCards(selectedUser, userCardsMeta.page - 1)}>Anterior</button>
            <button className="admin-tab" disabled={userCardsMeta.page >= userCardsMeta.totalPages} onClick={() => void loadUserCards(selectedUser, userCardsMeta.page + 1)}>Próxima</button>
          </div>}
        </>}
      </div>
    </section>
  </div>;
}
