"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AdminGachaCard, GachaPull } from "@/types";

export default function AdminGachaPage() {
  const [cards, setCards] = useState<AdminGachaCard[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string; name: string | null; userName: string | null }[]>([]);
  const [userCards, setUserCards] = useState<GachaPull[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [grantCardId, setGrantCardId] = useState("");
  const [form, setForm] = useState({ name: "", image: "", rarity: "COMUM" });
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCards() {
    try { setCards((await api.adminListGachaCards()).data); } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao carregar pool."); }
  }

  useEffect(() => { void loadCards(); }, []);

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

  async function loadUserCards(id: string) {
    setSelectedUser(id);
    try { setUserCards(await api.adminListUserCards(id)); } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao carregar cartas."); }
  }

  async function removeCard(id: string) {
    if (!window.confirm("Excluir carta?")) return;
    try { await api.adminDeleteUserCard(id); if (selectedUser) await loadUserCards(selectedUser); } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao excluir carta."); }
  }

  async function resetRoll() {
    if (!selectedUser || !window.confirm("Resetar roll de hoje?")) return;
    try { await api.adminResetGachaRoll(selectedUser); } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao resetar roll."); }
  }

  async function grantCard() {
    if (!selectedUser || !grantCardId) return;
    try {
      await api.adminGrantUserCard(selectedUser, grantCardId);
      setGrantCardId("");
      await loadUserCards(selectedUser);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao conceder carta."); }
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
          <input className="field" required placeholder="Raridade" value={form.rarity} onChange={e => setForm({ ...form, rarity: e.target.value })} />
          <button className="admin-tab w-fit" type="submit">{editing ? "Salvar" : "Criar"}</button>
        </form>
        <div className="mt-4 space-y-2">{cards.map(card => <div className="flex items-center justify-between border-b border-hairline py-2" key={card.id}><span className="text-mist">{card.name} <small>{card.rarity}</small></span><button className="admin-tab" onClick={() => { setEditing(card.id); setForm({ name: card.name, image: card.image ?? "", rarity: card.rarity }); }}>Editar</button></div>)}</div>
      </div>
      <div className="border border-hairline bg-panel p-4">
        <h2 className="font-display text-display-lg text-snow">Usuário</h2>
        <input className="field mt-4" placeholder="Buscar usuário" value={search} onChange={e => void searchUsers(e.target.value)} />
        <div className="mt-2 space-y-1">{users.map(user => <button className="block w-full p-2 text-left text-mist hover:bg-white/5" key={user.id} onClick={() => void loadUserCards(user.id)}>{user.userName ?? user.name ?? user.email}</button>)}</div>
        {selectedUser && <><div className="mt-4 flex gap-2"><button className="admin-tab" onClick={() => void resetRoll()}>Reset roll</button><select className="field" value={grantCardId} onChange={e => setGrantCardId(e.target.value)}><option value="">Escolher carta</option>{cards.map(card => <option key={card.id} value={card.id}>{card.name} · {card.rarity}</option>)}</select><button className="admin-tab" disabled={!grantCardId} onClick={() => void grantCard()}>Conceder</button></div><div className="mt-4 space-y-2">{userCards.map(card => <div className="flex items-center justify-between border-b border-hairline py-2" key={card.id}><span className="text-mist">{card.card.name} · {card.card.rarity}</span><button className="admin-tab" onClick={() => void removeCard(card.id)}>Excluir</button></div>)}</div></>}
      </div>
    </section>
  </div>;
}
