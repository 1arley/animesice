"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Code = { id: string; code: string; crystals: number; maxUses: number | null; uses: number; active: boolean; expiresAt: string | null };

export default function AdminCrystalCodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [form, setForm] = useState({ code: "", crystals: "2500", maxUses: "", expiresAt: "" });
  const [error, setError] = useState("");
  const load = () => api.adminCrystalCodes().then((data) => setCodes(data as Code[])).catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar códigos."));
  useEffect(() => { void load(); }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setError("");
    try { await api.adminCreateCrystalCode({ code: form.code || undefined, crystals: Number(form.crystals), maxUses: form.maxUses ? Number(form.maxUses) : undefined, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined }); setForm({ code: "", crystals: "2500", maxUses: "", expiresAt: "" }); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erro ao criar código."); }
  }
  return <main className="mx-auto max-w-shelf px-4 py-8"><h1 className="font-display text-display-lg text-snow">Códigos de Crystals</h1><p className="mt-1 text-mist">Crie recompensas promocionais para usuários.</p>
    {error && <p role="alert" className="mt-4 text-signal">{error}</p>}
    <form onSubmit={create} className="mt-6 grid gap-3 border border-hairline bg-panel p-4 md:grid-cols-4"><input className="input" placeholder="Código automático" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /><input className="input" type="number" min="1" placeholder="Crystals" value={form.crystals} onChange={e => setForm({ ...form, crystals: e.target.value })} /><input className="input" type="number" min="1" placeholder="Limite de usos" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} /><input className="input" type="datetime-local" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} /><button className="btn-primary px-4 py-2 md:col-span-4">Gerar código</button></form>
    <div className="mt-6 space-y-2">{codes.map(code => <div key={code.id} className="flex flex-wrap items-center justify-between gap-3 border border-hairline bg-panel p-4"><div><strong className="font-mono text-ice">{code.code}</strong><p className="text-body-sm text-mist">+{code.crystals.toLocaleString("pt-BR")} 💎 · {code.uses}/{code.maxUses ?? "∞"} usos{code.expiresAt ? ` · expira ${new Date(code.expiresAt).toLocaleString("pt-BR")}` : ""}</p></div><button className="btn-ghost px-3 py-2" onClick={() => void api.adminToggleCrystalCode(code.id, !code.active).then(load)}>{code.active ? "Desativar" : "Ativar"}</button></div>)}</div>
  </main>;
}
