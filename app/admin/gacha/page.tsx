"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AdminGachaCard, GachaPull } from "@/types";

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
  const [cards, setCards] = useState<AdminGachaCard[]>([]);
  const [cardMeta, setCardMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [cardSearch, setCardSearch] = useState("");
  const [rarity, setRarity] = useState("");
  const [users, setUsers] = useState<{ id: string; email: string; name: string | null; userName: string | null }[]>([]);
  const [userCards, setUserCards] = useState<GachaPull[]>([]);
  const [userCardsMeta, setUserCardsMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [userPage, setUserPage] = useState(1);
  const [userCardsVersion, setUserCardsVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [form, setForm] = useState({ name: "", image: "", rarity: "COMUM" });
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadCards(page = 1, name = cardSearch, rar = rarity) {
    try {
      const res = await api.adminListGachaCards(page, PAGE_SIZE, name || undefined, rar || undefined);
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

  async function saveCard(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) await api.adminUpdateGachaCard(editing, form);
      else await api.adminCreateGachaCard(form);
      setForm({ name: "", image: "", rarity: "COMUM" }); setEditing(null); await loadCards();
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

  return <div>
    <h1 className="font-display text-display-xl text-snow">Gacha</h1>
    {error && <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">{error}</div>}
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="border border-hairline bg-panel p-4">
        <h2 className="font-display text-display-lg text-snow">Pool</h2>
        <form className="mt-4 grid gap-3" onSubmit={saveCard}>
          <input className="field" required placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="field" placeholder="Imagem" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} />
          <select className="field" value={form.rarity} onChange={e => setForm({ ...form, rarity: e.target.value })}>
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="admin-tab w-fit" type="submit">{editing ? "Salvar" : "Criar"}</button>
        </form>
        <div className="mt-4 flex gap-2">
          <input className="field flex-1" placeholder="Buscar carta por nome" value={cardSearch} onChange={e => onCardSearch(e.target.value)} />
          <select className="field w-40" value={rarity} onChange={e => onRarityChange(e.target.value)}>
            <option value="">Todas</option>
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <p className="mt-2 font-mono text-caption text-mist-soft">{cardMeta.total} cartas · página {cardMeta.page}/{cardMeta.totalPages}</p>
        <div className="mt-2 space-y-2">{cards.map(card => <div className="flex items-center justify-between gap-2 border-b border-hairline py-2" key={card.id}>
          <span className="min-w-0 truncate text-mist">{card.name} <small>{card.rarity}</small></span>
          <span className="flex flex-none gap-1">
            <button className="admin-tab" onClick={() => { setEditing(card.id); setForm({ name: card.name, image: card.image ?? "", rarity: card.rarity }); }}>Editar</button>
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
            <span className="min-w-0 truncate text-mist">{card.card.name} · {card.card.rarity}</span>
            <button className="admin-tab flex-none" onClick={() => void removeCard(card.id)}>Excluir</button>
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
