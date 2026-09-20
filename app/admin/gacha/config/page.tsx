"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";

interface ConfigEntry {
  key: string;
  value: unknown;
  label: string;
  group: string;
}

const GROUP_LABELS: Record<string, string> = {
  economia: "Economia",
  bypass: "Bypass (real money)",
  mercado: "Mercado",
  trocas: "Trocas",
  skins: "Skins",
  destaque: "Carta destaque",
  rates: "Drop rates",
  valores: "Valores",
};

export default function AdminGachaConfigPage() {
  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await api.adminGachaConfig());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar config.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(entry: ConfigEntry) {
    setEditing(entry.key);
    setDraft(JSON.stringify(entry.value, null, 2));
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }

  async function saveEdit(key: string) {
    setError("");
    try {
      const parsed = JSON.parse(draft);
      await api.adminUpdateGachaConfig(key, parsed);
      setEditing(null);
      setDraft("");
      toast("Configuração salva.", "success");
      await load();
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError("JSON inválido.");
      } else {
        setError(e instanceof ApiError ? e.message : "Erro ao salvar.");
      }
    }
  }

  const grouped = entries.reduce<Record<string, ConfigEntry[]>>((acc, e) => {
    (acc[e.group] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-display-xl text-snow">
          Configuração do Gacha
        </h1>
        <Link href="/admin/gacha" className="btn-ghost px-4 py-2">
          Voltar
        </Link>
      </div>
      <p className="mt-2 text-body-sm text-mist">
        Alterações aplicam imediatamente. Não requer deploy.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-signal">
          {error}
        </p>
      )}

      {loading ? (
        <div className="skeleton mt-6 h-64" aria-busy="true" />
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <section key={group} className="mt-6">
            <h2 className="font-display text-body-lg text-snow">
              {GROUP_LABELS[group] ?? group}
            </h2>
            <div className="mt-2 grid gap-2">
              {items.map((entry) => (
                <div
                  key={entry.key}
                  className="flex flex-wrap items-start gap-3 border border-hairline bg-panel p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm text-snow">{entry.label}</p>
                    <p className="font-mono text-caption text-mist">
                      {entry.key}
                    </p>
                    {editing === entry.key ? (
                      <textarea
                        className="field mt-2 min-h-24 w-full font-mono text-xs"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                      />
                    ) : (
                      <pre className="mt-1 max-h-24 overflow-auto font-mono text-caption text-mist">
                        {typeof entry.value === "object"
                          ? JSON.stringify(entry.value)
                          : String(entry.value)}
                      </pre>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {editing === entry.key ? (
                      <>
                        <button
                          type="button"
                          className="btn-ice px-3 py-2 font-mono text-caption"
                          onClick={() => void saveEdit(entry.key)}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2 font-mono text-caption"
                          onClick={cancelEdit}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost px-3 py-2 font-mono text-caption"
                        onClick={() => startEdit(entry)}
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
