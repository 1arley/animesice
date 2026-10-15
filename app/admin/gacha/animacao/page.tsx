"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/common/ToastProvider";
import { useAuth } from "@/lib/auth-context";
import {
  RollStage,
  DEFAULT_ROLL_ANIM_CONFIG,
  parseRollAnimJson,
  type RollAnimConfig,
} from "@/components/gacha/RollStage";
import { CodeStagePreview, type CompileStatus } from "@/components/gacha/CodeStagePreview";
import {
  ReasonField,
  SensitiveWriteDialog,
  useSensitiveWrite,
} from "@/components/admin/SensitiveWrite";
import { GachaAdminTabs } from "@/components/admin/GachaAdminTabs";
import type { GachaPull } from "@/types";

/** [raridade, foil, valor] — um sample por tier pra ver cada etapa da animação. */
const SAMPLES: Array<[string, string, number]> = [
  ["COMUM", "NORMAL", 10],
  ["INCOMUM", "NORMAL", 25],
  ["RARA", "HOLO", 60],
  ["EPICA", "GOLD", 150],
  ["LENDARIA", "INK", 400],
  ["MITICA", "PRISM", 1000],
  ["GALACTICA", "PRISM", 5000],
];

const ANIM_FILE = "src/components/gacha/RollStage.tsx";

const SAMPLE_PULLS: GachaPull[] = SAMPLES.map(([rarity, foil, value]) => ({
  id: `preview-${rarity}`,
  condition: 100,
  foil,
  edition: 1,
  value,
  obtainedAt: new Date().toISOString(),
  user: { id: "", name: null, userName: null, avatar: null },
  card: {
    id: `preview-${rarity}`,
    name: `Carta ${rarity}`,
    image: "/aeliana/Aeliana.png",
    imageHidden: false,
    rarity,
    favourites: 0,
    animeId: null,
    animeTitle: "Demo",
    anime: null,
  },
}));

function Field({
  label,
  fieldKey,
  value,
  onChange,
  type = "number",
  step,
  min,
  max,
  help,
}: {
  label: string;
  fieldKey: string;
  value: number | string;
  onChange: (key: string, value: unknown) => void;
  type?: "number" | "text";
  step?: number;
  min?: number;
  max?: number;
  help?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldKey} className="flex items-center gap-2 text-body-sm text-snow">
        <span className="min-w-[160px] font-mono text-xs text-mist">{fieldKey}</span>
        <span>{label}</span>
        {help && (
          <span className="ml-auto text-xs text-mist/70" title={help}>
            (?)
          </span>
        )}
      </label>
      <input
        id={fieldKey}
        type={type}
        value={value}
        onChange={(e) =>
          onChange(fieldKey, type === "number" ? Number(e.target.value) : e.target.value)
        }
        step={step}
        min={min}
        max={max}
        className="field flex-1 min-w-0 font-mono text-sm"
      />
    </div>
  );
}

function ArrayField({
  label,
  fieldKey,
  value,
  onChange,
  itemType = "number",
}: {
  label: string;
  fieldKey: string;
  value: Array<number | string>;
  onChange: (key: string, value: unknown) => void;
  itemType?: "number" | "text";
}) {
  const [local, setLocal] = useState(value.join(", "));

  useEffect(() => {
    setLocal(value.join(", "));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const arr = e.target.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (itemType === "number" ? Number(s) : s));
    setLocal(e.target.value);
    onChange(fieldKey, arr);
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldKey} className="flex items-center gap-2 text-body-sm text-snow">
        <span className="min-w-[160px] font-mono text-xs text-mist">{fieldKey}</span>
        <span>{label}</span>
      </label>
      <input
        id={fieldKey}
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={itemType === "number" ? "1, 2, 3" : '"a", "b"'}
        className="field flex-1 min-w-0 font-mono text-sm"
      />
      <p className="text-caption text-mist">
        Separado por vírgulas. Atual: {value.length} itens
      </p>
    </div>
  );
}

function ObjectField({
  label,
  fieldKey,
  value,
  onChange,
}: {
  label: string;
  fieldKey: string;
  value: Record<string, number>;
  onChange: (key: string, value: unknown) => void;
}) {
  const [local, setLocal] = useState(JSON.stringify(value, null, 2));

  useEffect(() => {
    setLocal(JSON.stringify(value, null, 2));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    try {
      const parsed = JSON.parse(e.target.value);
      setLocal(e.target.value);
      onChange(fieldKey, parsed);
    } catch {
      setLocal(e.target.value);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldKey} className="text-body-sm text-snow">
        {label} <span className="font-mono text-xs text-mist">({fieldKey})</span>
      </label>
      <textarea
        id={fieldKey}
        value={local}
        onChange={handleChange}
        className="field min-h-20 font-mono text-xs"
        spellCheck={false}
      />
    </div>
  );
}

function SelectField({
  label,
  fieldKey,
  value,
  options,
  onChange,
}: {
  label: string;
  fieldKey: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldKey} className="text-body-sm text-snow">
        {label} <span className="font-mono text-xs text-mist">({fieldKey})</span>
      </label>
      <select
        id={fieldKey}
        value={value}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className="field font-mono text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function AdminGachaAnimacaoPage() {
  const [config, setConfig] = useState<RollAnimConfig>(DEFAULT_ROLL_ANIM_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(DEFAULT_ROLL_ANIM_CONFIG, null, 2));
  const [jsonError, setJsonError] = useState("");
  const [tab, setTab] = useState<"config" | "codigo">("config");
  const [source, setSource] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<CompileStatus>({ state: "idle" });
  const [runId, setRunId] = useState(0);
  /** Evita reformatar a textarea (e roubar o cursor) quando quem mudou a config foi ela. */
  const fromText = useRef(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = user?.role === "SUPERADMIN";
  const { motivo, setMotivo, confirming, setConfirming, motivoError } =
    useSensitiveWrite();
  const animBefore = useRef(JSON.stringify(DEFAULT_ROLL_ANIM_CONFIG));

  const currentPull = useMemo(() => SAMPLE_PULLS[previewIndex], [previewIndex]);
  const compileLabel =
    codeStatus.state === "compiling"
      ? "compilando…"
      : codeStatus.state === "ok"
        ? "compila"
        : codeStatus.state === "error"
          ? "erro de compilação"
          : source === null
            ? "nada carregado"
            : "";

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const entries = await api.adminGachaConfig();
        const animEntry = entries.find((e) => e.key === "anim_roll");
        if (animEntry && typeof animEntry.value === "object" && animEntry.value !== null) {
          setConfig({ ...DEFAULT_ROLL_ANIM_CONFIG, ...(animEntry.value as Partial<RollAnimConfig>) });
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function handleChange(key: string, value: unknown) {
    fromText.current = false;
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function loadSource() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/gacha/anim-source");
      const data = (await response.json()) as { source?: string; message?: string };
      if (!response.ok || !data.source) throw new Error(data.message ?? "Não consegui ler o arquivo.");
      setSource(data.source);
      toast("Arquivo carregado.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao carregar o arquivo.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function saveSource() {
    if (source === null) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/gacha/anim-source", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Não consegui salvar.");
      toast("Arquivo salvo. Commite e faça deploy pra valer no site.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro ao salvar o arquivo.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Espelho da config em JSON. Só reformata quando a mudança veio dos campos.
  useEffect(() => {
    if (fromText.current) {
      fromText.current = false;
      return;
    }
    setJsonText(JSON.stringify(config, null, 2));
  }, [config]);

  /** Cola/aplica: objeto JSON parcial vira config na hora, sem salvar. */
  function applyJson(text: string) {
    setJsonText(text);
    if (!text.trim()) {
      setJsonError("");
      return;
    }
    const parsed = parseRollAnimJson(text);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    setJsonError("");
    fromText.current = true;
    setConfig((prev) => ({ ...prev, ...parsed.value }));
  }

  async function commitConfig() {
    animBefore.current = JSON.stringify(config);
    setError("");
    setSaving(true);
    try {
      await api.adminUpdateGachaConfig("anim_roll", config, motivo.trim());
      setConfirming(false);
      setMotivo("");
      toast("Configuração de animação salva.", "success");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  /** A animação vale na hora para todo mundo: motivo antes de gravar. */
  function handleSave() {
    setError("");
    if (motivoError) {
      setError(motivoError);
      return;
    }
    setConfirming(true);
  }

  async function handleReset() {
    setConfig(DEFAULT_ROLL_ANIM_CONFIG);
    toast("Valores padrão restaurados — clique em Salvar para gravar.", "success");
  }

  function openPreview() {
    setPreviewOpen(true);
  }

  function closePreview() {
    setPreviewOpen(false);
  }

  const groups = useMemo(
    () => [
      {
        label: "Entrada & Fundo",
        keys: [
          { key: "enterDuration", label: "Duração entrada carta", step: 0.01, min: 0, max: 2 },
          { key: "crystalSpinAt", label: "Início giro cristal", step: 0.01, min: 0, max: 3 },
          { key: "crystalSpinDuration", label: "Duração giro cristal", step: 0.01, min: 0.1, max: 3 },
          { key: "glowAt", label: "Início brilho", step: 0.01, min: 0, max: 3 },
          { key: "glowDuration", label: "Duração brilho", step: 0.01, min: 0.1, max: 3 },
          { key: "skipAt", label: "Botão pular aparece em", step: 0.01, min: 0, max: 3 },
        ],
      },
      {
        label: "Revelação & Circuitos",
        keys: [
          { key: "revealAt", label: "Ponto de revelação (aguarda pull)", step: 0.01, min: 0.5, max: 5 },
          {
            key: "teaseMode",
            label: "Sequência de brilho",
            type: "select" as const,
            options: [
              { value: "random", label: "Aleatória" },
              { value: "ordered", label: "Antiga, ordenada (desce)" },
              { value: "climb", label: "Ascendente (sobe até a real)" },
            ],
          },
          { key: "maxDrop", label: "Queda máx. de tiers (só no aleatório)", step: 1, min: 0, max: 6 },
          { key: "crystalOutDuration", label: "Saída do cristal", step: 0.01, min: 0.05, max: 1 },
          { key: "ringSlots", label: "Slots de anéis (máx)", step: 1, min: 0, max: 6 },
          { key: "ringDuration", label: "Duração anéis", step: 0.01, min: 0.1, max: 2 },
          { key: "ringStagger", label: "Stagger anéis", step: 0.01, min: 0, max: 0.5 },
          { key: "particleSlots", label: "Slots de partículas", step: 1, min: 0, max: 48 },
          { key: "particleDuration", label: "Duração partículas", step: 0.01, min: 0.1, max: 2 },
          { key: "particleReach", label: "Alcance partículas {x, y}", type: "object" as const },
          { key: "particleGalaxy", label: "Cores galácticas (hex)", type: "array" as const },
        ],
      },
      {
        label: "Flip & Finalização",
        keys: [
          { key: "effectsGap", label: "Atraso do flip após revelação", step: 0.01, min: 0, max: 1 },
          { key: "flipDuration", label: "Duração flip", step: 0.01, min: 0.1, max: 2 },
          { key: "sweepDuration", label: "Duração sweep (brilho)", step: 0.01, min: 0.1, max: 2 },
          { key: "badgeDuration", label: "Duração badge", step: 0.01, min: 0.05, max: 1 },
        ],
      },
    ],
    []
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-display-xl text-snow">
          Animação do Roll (Giro)
        </h1>
        {canEdit && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button type="button" onClick={handleReset} className="btn-ghost px-3 py-2">
                Restaurar padrão
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-ice px-4 py-2"
              >
                {saving ? "Salvando…" : "Salvar configuração"}
              </button>
            </div>
            <div className="w-full sm:w-80">
              <ReasonField id="anim-motivo" value={motivo} onChange={setMotivo} />
            </div>
          </div>
          )}
      </div>

      <div className="mt-4">
        <GachaAdminTabs current="/admin/gacha/animacao" />
      </div>

      <p className="mt-2 text-body-sm text-mist">
        {canEdit
          ? "Altera timings, contadores e cores da animação de giro. Aplica imediatamente sem deploy — grava por isso com motivo e confirmação."
          : "Prévia da animação atual. Apenas SUPERADMIN pode alterar a configuração."}
      </p>

      <SensitiveWriteDialog
        open={confirming}
        busy={saving}
        title="Alterar animação do roll?"
        entryKey="anim_roll"
        before={animBefore.current}
        after={JSON.stringify(config).slice(0, 120)}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void commitConfig()}
      />

      {error && (
        <p role="alert" className="mt-3 text-signal">
          {error}
        </p>
      )}

      <div role="tablist" aria-label="Modo de edição" className="mt-6 flex gap-1 border-b border-hairline">
        {(["config", "codigo"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            id={`roll-anim-tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`roll-anim-panel-${value}`}
            onClick={() => setTab(value)}
            className={`min-h-11 px-4 font-mono text-xs uppercase tracking-widest ${
              tab === value ? "border-b-2 border-ice text-ice" : "text-mist hover:text-snow"
            }`}
          >
            {value === "config" ? "Configuração" : "Código (arquivo inteiro)"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton mt-6 h-64" aria-busy="true" />
      ) : (
        <>
          {tab === "config" ? (
            <>
              <div id="roll-anim-panel-config" role="tabpanel" aria-labelledby="roll-anim-tab-config" className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
            {canEdit && <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.label} className="border border-hairline bg-panel p-4 rounded-lg">
                  <h2 className="font-display text-body-lg text-snow">{group.label}</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {group.keys.map((field) => {
                      const val = config[field.key as keyof RollAnimConfig];
                      if (field.type === "object") {
                        return (
                          <ObjectField
                            key={field.key}
                            label={field.label}
                            fieldKey={field.key}
                            value={val as Record<string, number>}
                            onChange={handleChange}
                          />
                        );
                      }
                      if (field.type === "array") {
                        return (
                          <ArrayField
                            key={field.key}
                            label={field.label}
                            fieldKey={field.key}
                            value={val as Array<string>}
                            onChange={handleChange}
                            itemType="text"
                          />
                        );
                      }
                      if (field.type === "select") {
                        return (
                          <SelectField
                            key={field.key}
                            label={field.label}
                            fieldKey={field.key}
                            value={val as string}
                            options={field.options ?? []}
                            onChange={handleChange}
                          />
                        );
                      }
                      return (
                        <Field
                          key={field.key}
                          label={field.label}
                          fieldKey={field.key}
                          value={val as number}
                          onChange={handleChange}
                          step={field.step}
                          min={field.min}
                          max={field.max}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>}

            <aside className="border border-hairline bg-panel p-4 rounded-lg sticky top-24">
              <h2 className="font-display text-body-lg text-snow">Preview ao vivo</h2>
              <p className="mt-1 text-caption text-mist">
                Abre o modal real com a configuração atual (não salva).
              </p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {SAMPLE_PULLS.map((sample, i) => (
                  <button
                    key={sample.card.rarity}
                    type="button"
                    onClick={() => setPreviewIndex(i)}
                    className={`relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition ${
                      i === previewIndex ? "border-ice" : "border-hairline hover:border-ice/50"
                    }`}
                  >
                    <Image
                      src={sample.card.image ?? ""}
                      alt={sample.card.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-deep/80 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="font-medium text-snow truncate text-sm">{sample.card.name}</p>
                      <p className="font-mono text-xs text-ice">{sample.card.rarity}</p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={openPreview}
                disabled={previewOpen}
                className="mt-4 btn-ice w-full px-4 py-3"
              >
                {previewOpen ? "Preview aberto…" : "Abrir preview"}
              </button>

              <label className="mt-4 block border-t border-hairline pt-4">
                <span className="font-mono text-xs text-mist">
                  JSON (colar ou editar) - objeto parcial, aplica sem salvar
                </span>
                <textarea
                  value={jsonText}
                  onChange={(event) => applyJson(event.target.value)}
                  spellCheck={false}
                  rows={12}
                  aria-invalid={jsonError ? true : undefined}
                  aria-describedby="roll-anim-json-help"
                  className="mt-2 max-h-56 w-full overflow-auto rounded bg-ink-deep p-2 font-mono text-xs text-snow focus-visible:outline focus-visible:outline-ice"
                />
                <span
                  id="roll-anim-json-help"
                  role={jsonError ? "alert" : undefined}
                  className={`mt-1 block font-mono text-xs ${jsonError ? "text-signal" : "text-mist"}`}
                >
                  {jsonError || "Só as chaves enviadas mudam. Edite aqui ou nos campos acima."}
                </span>
              </label>
            </aside>
          </div>

          {previewOpen && (
            <RollStage
              pull={currentPull}
              onClose={closePreview}
              preview
              config={config}
            />
          )}
            </>
          ) : (
            <section
              id="roll-anim-panel-codigo"
              role="tabpanel"
              aria-labelledby="roll-anim-tab-codigo"
              className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="font-mono text-xs text-mist">{ANIM_FILE}</code>
                  <span role="status" aria-live="polite" className="font-mono text-xs text-mist">
                    {compileLabel}
                  </span>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button type="button" className="btn-ghost" onClick={loadSource} disabled={loading}>
                      Carregar do arquivo
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={source === null}
                      onClick={() => {
                        void navigator.clipboard.writeText(source ?? "");
                        toast("Arquivo copiado.", "success");
                      }}
                    >
                      Copiar
                    </button>
                    <button
                      type="button"
                      className="btn-ice"
                      onClick={() => setRunId((n) => n + 1)}
                      disabled={codeStatus.state === "error" || source === null}
                    >
                      Reproduzir
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        className="btn-ice"
                        onClick={saveSource}
                        disabled={saving || source === null}
                      >
                        {saving ? "Salvando…" : "Salvar no arquivo"}
                      </button>
                    )}
                  </div>
                </div>

                {codeStatus.state === "error" && (
                  <pre
                    role="alert"
                    className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded border border-signal/40 bg-signal/5 p-3 font-mono text-xs text-signal"
                  >
                    {codeStatus.message}
                  </pre>
                )}

                <label htmlFor="roll-anim-source" className="sr-only">
                  Fonte do arquivo da animação
                </label>
                <textarea
                  id="roll-anim-source"
                  value={source ?? ""}
                  onChange={(event) => setSource(event.target.value)}
                  spellCheck={false}
                  placeholder="Cole aqui o arquivo inteiro da animação (ex.: src/components/gacha/RollStage.tsx)."
                  className="mt-3 h-[60vh] w-full resize-y rounded border border-hairline bg-panel p-3 font-mono text-xs leading-relaxed text-snow focus-visible:outline focus-visible:outline-ice"
                />
              </div>

              <div className="min-w-0">
                <h3 className="font-mono text-xs uppercase tracking-widest text-mist">Prévia</h3>
                <p className="mt-1 text-xs text-mist">
                  Roda a carta de exemplo escolhida no topo. O arquivo só entra no site no próximo deploy.
                </p>
                {currentPull && (
                  <CodeStagePreview
                    source={source ?? ""}
                    pull={currentPull}
                    runId={runId}
                    onStatus={setCodeStatus}
                  />
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
