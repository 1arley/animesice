"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";

type Code = {
  id: string;
  code: string;
  crystals: number;
  maxUses: number | null;
  uses: number;
  active: boolean;
  expiresAt: string | null;
  _count?: { redemptions: number };
};

const blank = { code: "", crystals: "2500", maxUses: "", expiresAt: "" };

export default function AdminCrystalCodesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCodes((await api.adminCrystalCodes()) as Code[]);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Erro ao carregar códigos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEditing(c: Code) {
    setEditing(c.id);
    setForm({
      code: c.code,
      crystals: String(c.crystals),
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      expiresAt: c.expiresAt
        ? new Date(c.expiresAt).toISOString().slice(0, 16)
        : "",
    });
    setError("");
  }

  function cancelEditing() {
    setEditing(null);
    setForm(blank);
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const body = {
      code: form.code || undefined,
      crystals: Number(form.crystals),
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      expiresAt: form.expiresAt
        ? new Date(form.expiresAt).toISOString()
        : undefined,
    };
    try {
      if (editing) {
        await api.adminUpdateCrystalCode(editing, body);
        toast("Código atualizado.", "success");
      } else {
        await api.adminCreateCrystalCode(body);
        toast("Código criado.", "success");
      }
      cancelEditing();
      await load();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : editing
            ? "Erro ao atualizar código."
            : "Erro ao criar código.",
      );
    }
  }

  async function toggle(id: string, active: boolean) {
    try {
      await api.adminToggleCrystalCode(id, active);
      toast(active ? "Código ativado." : "Código desativado.", "success");
      await load();
    } catch (e) {
      toast(
        e instanceof ApiError ? e.message : "Erro ao alterar status.",
        "error",
      );
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await api.adminDeleteCrystalCode(id);
      toast("Código excluído.", "success");
      await load();
    } catch (e) {
      toast(
        e instanceof ApiError ? e.message : "Erro ao excluir código.",
        "error",
      );
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="mx-auto max-w-shelf px-4 py-8">
      <h1 className="font-display text-display-lg text-snow">
        Códigos de Crystals
      </h1>
      <p className="mt-1 text-mist">
        Crie recompensas promocionais para usuários.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-signal">
          {error}
        </p>
      )}

      <form
        onSubmit={void save}
        className="mt-6 grid gap-3 border border-hairline bg-panel p-4 md:grid-cols-4"
      >
        <input
          className="input"
          placeholder={editing ? "Código" : "Código automático"}
          value={form.code}
          onChange={(e) =>
            setForm({ ...form, code: e.target.value.toUpperCase() })
          }
        />
        <input
          className="input"
          type="number"
          min="1"
          placeholder="Crystals"
          value={form.crystals}
          onChange={(e) => setForm({ ...form, crystals: e.target.value })}
        />
        <input
          className="input"
          type="number"
          min="1"
          placeholder="Limite de usos"
          value={form.maxUses}
          onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
        />
        <input
          className="input"
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
        />
        <div className="flex gap-2 md:col-span-4">
          <button className="btn-primary px-4 py-2" type="submit">
            {editing ? "Salvar" : "Gerar código"}
          </button>
          {editing && (
            <button
              className="btn-ghost px-4 py-2"
              type="button"
              onClick={cancelEditing}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="mt-6 text-mist">Carregando…</div>
      ) : codes.length === 0 ? (
        <div className="mt-6 border border-hairline bg-panel p-8 text-center text-mist">
          Nenhum código encontrado.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border border-hairline">
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-hairline bg-panel text-mist">
              <tr>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Crystals</th>
                <th className="px-3 py-2 font-medium">Usos</th>
                <th className="px-3 py-2 font-medium">Validade</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {codes.map((c) => (
                <tr key={c.id} className="bg-panel">
                  <td className="px-3 py-2 font-mono text-ice">{c.code}</td>
                  <td className="px-3 py-2 text-ice">
                    +{c.crystals.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-mist">
                    {c.uses}/{c.maxUses ?? "∞"}
                  </td>
                  <td className="px-3 py-2 text-mist">
                    {c.expiresAt
                      ? new Date(c.expiresAt).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${c.active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}`}
                    >
                      {c.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => startEditing(c)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => void toggle(c.id, !c.active)}
                      >
                        {c.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        className="btn-ghost px-2 py-1 text-xs text-signal"
                        disabled={deleting === c.id}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Excluir o código "${c.code}"? Essa ação não pode ser desfeita.`,
                            )
                          ) {
                            void remove(c.id);
                          }
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
