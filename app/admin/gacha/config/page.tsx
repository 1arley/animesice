"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/common/ToastProvider";
import { SearchField } from "@/components/ui/SearchField";
import { GachaAdminTabs } from "@/components/admin/GachaAdminTabs";
import {
  ReasonField,
  SensitiveWriteDialog,
  useSensitiveWrite,
} from "@/components/admin/SensitiveWrite";

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

/** Grupos que mexem em dinheiro: precisam de confirmação e motivo antes do PATCH. */
const SENSITIVE_GROUPS = new Set(["economia", "bypass", "mercado", "trocas", "rates"]);
const PREVIEW_MAX = 120;

function groupTitle(group: string) {
  return (
    GROUP_LABELS[group] ??
    group.charAt(0).toUpperCase() + group.slice(1).replace(/[._-]/g, " ")
  );
}

/** Texto para a tela de leitura: objeto legível, primitivo como string. */
function readValue(value: unknown) {
  return typeof value === "object" && value !== null
    ? JSON.stringify(value, null, 2)
    : String(value);
}

export default function AdminGachaConfigPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [original, setOriginal] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const { motivo, setMotivo, confirming, setConfirming, motivoError } =
    useSensitiveWrite();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const motivoRef = useRef<HTMLInputElement>(null);

  /** O PATCH exige SUPERADMIN (gacha.controller.ts); esconder o botão evita o erro cru. */
  const canEdit = user?.role === "SUPERADMIN";
  const dirty = editing !== null && draft !== original;
  const editingEntry = editing
    ? (entries.find((entry) => entry.key === editing) ?? null)
    : null;

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

  const startEdit = useCallback((entry: ConfigEntry, syncUrl = true) => {
    const pretty = JSON.stringify(entry.value, null, 2);
    setEditing(entry.key);
    setDraft(pretty);
    setOriginal(pretty);
    setMotivo("");
    setFieldError("");
    setError("");
    if (syncUrl)
      window.history.replaceState(
        null,
        "",
        `?chave=${encodeURIComponent(entry.key)}`,
      );
  }, [setMotivo]);

  /** Deep link: /admin/gacha/config?chave=economia.custoRoll abre a chave em edição. */
  useEffect(() => {
    if (loading || editing) return;
    const key = new URLSearchParams(window.location.search).get("chave");
    const entry = entries.find((item) => item.key === key);
    if (entry) startEdit(entry, false);
  }, [editing, entries, loading, startEdit]);

  // Rascunho perdido por acento em "Voltar" ou fechar o navegador.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  function closeEditor() {
    setEditing(null);
    setDraft("");
    setOriginal("");
    setMotivo("");
    setFieldError("");
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function saveEdit() {
    if (!editing || saving) return;
    setSaving(true);
    try {
      await api.adminUpdateGachaConfig(editing, JSON.parse(draft), motivo.trim());
      setConfirming(false);
      closeEditor();
      toast("Configuração salva.", "success");
      await load();
    } catch (e) {
      setFieldError(e instanceof ApiError ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  /** Valida antes de qualquer rede: erro aparece dentro do card, nunca no topo. */
  function requestSave() {
    if (!editing || saving) return;
    setFieldError("");
    try {
      JSON.parse(draft);
    } catch {
      setFieldError('JSON inválido. Exemplo: {"chave": 1} ou ["a", "b"].');
      textareaRef.current?.focus();
      return;
    }
    if (motivoError) {
      setFieldError(motivoError);
      motivoRef.current?.focus();
      return;
    }
    if (editingEntry && SENSITIVE_GROUPS.has(editingEntry.group)) {
      setConfirming(true);
      return;
    }
    void saveEdit();
  }

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter((entry) =>
      `${entry.label} ${entry.key} ${groupTitle(entry.group)}`
        .toLowerCase()
        .includes(term),
    );
  }, [entries, query]);

  const grouped = useMemo(() => {
    const acc: Record<string, ConfigEntry[]> = {};
    for (const entry of visible) (acc[entry.group] ??= []).push(entry);
    const known = Object.keys(GROUP_LABELS);
    return Object.entries(acc).sort(
      ([left], [right]) =>
        (known.indexOf(left) === -1 ? known.length : known.indexOf(left)) -
        (known.indexOf(right) === -1 ? known.length : known.indexOf(right)),
    );
  }, [visible]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-display-xl text-snow">
          Configuração do Gacha
        </h1>
        <GachaAdminTabs current="/admin/gacha/config" />
      </div>
      <p className="mt-2 max-w-2xl text-body-sm text-mist">
        Alterações aplicam imediatamente. Não requer deploy. Economia, mercado e
        dinheiro real pedem confirmação e motivo, que fica no histórico.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-3 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
        >
          {error}
        </p>
      )}

      {!canEdit && (
        <p className="mt-4 border border-hairline bg-panel p-3 text-body-sm text-mist">
          Você pode conferir os valores, mas só contas superadmin alteram estas
          chaves.
        </p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <SearchField
          placeholder="Buscar chave, rótulo ou grupo"
          aria-label="Buscar configuração"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          containerClassName="w-full"
        />
        <p className="self-center font-mono text-caption text-mist-soft">
          {visible.length}/{entries.length} chaves
        </p>
      </div>

      {loading ? (
        <div className="skeleton mt-6 h-64" aria-busy="true" />
      ) : entries.length === 0 ? (
        <p className="mt-6 border border-hairline bg-panel p-4 text-body-sm text-mist">
          Nenhuma chave de configuração cadastrada.
        </p>
      ) : grouped.length === 0 ? (
        <p className="mt-6 border border-hairline bg-panel p-4 text-body-sm text-mist">
          Nenhuma chave bate com “{query.trim()}”.{" "}
          <button
            type="button"
            className="admin-tab mt-2"
            onClick={() => setQuery("")}
          >
            Limpar busca
          </button>
        </p>
      ) : (
        grouped.map(([group, items]) => (
          <section key={group} className="mt-6">
            <h2 className="font-display text-body-lg text-snow">
              {groupTitle(group)}
              {SENSITIVE_GROUPS.has(group) && (
                <span className="badge badge-signal ml-2 align-middle">
                  sensível
                </span>
              )}
            </h2>
            <div className="mt-2 grid gap-2">
              {items.map((entry) => {
                const isEditing = editing === entry.key;
                return (
                  <div
                    key={entry.key}
                    className={`flex gap-3 border border-hairline bg-panel p-3 ${
                      isEditing ? "flex-col" : "flex-wrap items-start"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm text-snow">{entry.label}</p>
                      <p className="font-mono text-caption text-mist">
                        {entry.key}
                      </p>
                      {isEditing ? (
                        <>
                          <textarea
                            ref={textareaRef}
                            className="field mt-2 min-h-24 w-full font-mono text-base sm:text-xs"
                            aria-label={`Valor de ${entry.label} (${entry.key})`}
                            aria-invalid={fieldError ? true : undefined}
                            aria-describedby={
                              fieldError ? `erro-${entry.key}` : undefined
                            }
                            autoCapitalize="off"
                            autoComplete="off"
                            spellCheck={false}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") closeEditor();
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                                requestSave();
                            }}
                          />
                          <div className="mt-2">
                            <ReasonField
                              id={`motivo-${entry.key}`}
                              inputRef={motivoRef}
                              value={motivo}
                              onChange={setMotivo}
                            />
                          </div>
                        </>
                      ) : (
                        <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap wrap-anywhere font-mono text-caption text-mist">
                          {readValue(entry.value)}
                        </pre>
                      )}
                      {isEditing && fieldError && (
                        <p
                          id={`erro-${entry.key}`}
                          role="alert"
                          className="mt-2 border border-signal/40 bg-signal/10 p-2 text-caption text-signal"
                        >
                          {fieldError}
                        </p>
                      )}
                    </div>
                    <div
                      className={`flex gap-2 ${
                        isEditing ? "w-full sm:w-auto" : "shrink-0"
                      }`}
                    >
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            className={`btn-ice px-3 py-2 font-mono text-caption ${
                              isEditing ? "flex-1 sm:flex-none" : ""
                            }`}
                            disabled={saving}
                            onClick={requestSave}
                          >
                            {saving ? "Salvando…" : "Salvar"}
                          </button>
                          <button
                            type="button"
                            className={`btn-ghost px-3 py-2 font-mono text-caption ${
                              isEditing ? "flex-1 sm:flex-none" : ""
                            }`}
                            disabled={saving || !dirty}
                            onClick={() => setDraft(original)}
                          >
                            Reverter
                          </button>
                          <button
                            type="button"
                            className={`btn-ghost px-3 py-2 font-mono text-caption ${
                              isEditing ? "flex-1 sm:flex-none" : ""
                            }`}
                            disabled={saving}
                            onClick={closeEditor}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : canEdit ? (
                        <button
                          type="button"
                          className="btn-ghost px-3 py-2 font-mono text-caption"
                          onClick={() => startEdit(entry)}
                        >
                          Editar
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      <SensitiveWriteDialog
        open={confirming}
        busy={saving}
        title="Alterar configuração sensível?"
        entryKey={editing ?? ""}
        before={original}
        after={draft.replace(/\s+/g, " ").slice(0, PREVIEW_MAX)}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void saveEdit()}
      />
    </div>
  );
}