"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/common/ToastProvider";
import { GachaAdminTabs } from "@/components/admin/GachaAdminTabs";
import {
  ReasonField,
  SensitiveWriteDialog,
  useSensitiveWrite,
} from "@/components/admin/SensitiveWrite";
interface ClaimEvent {
  active: boolean;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  spinsPerHour: number | null;
}

const EMPTY_EVENT: ClaimEvent = {
  active: false,
  name: "",
  startsAt: null,
  endsAt: null,
  spinsPerHour: null,
};

/** ISO do banco → valor de <input type="datetime-local"> no fuso local. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local (fuso local) → ISO UTC; vazio → null. */
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatLocal(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

type EventPhase = "desligado" | "agendado" | "ativo" | "encerrado";

function phaseOf(event: ClaimEvent, now: number): EventPhase {
  if (!event.active) return "desligado";
  const start = event.startsAt ? new Date(event.startsAt).getTime() : null;
  const end = event.endsAt ? new Date(event.endsAt).getTime() : null;
  if (start !== null && now < start) return "agendado";
  if (end !== null && now >= end) return "encerrado";
  return "ativo";
}

const PHASE_BADGE: Record<EventPhase, { label: string; className: string }> = {
  desligado: { label: "Desligado", className: "badge" },
  agendado: { label: "Agendado", className: "badge badge-ice" },
  ativo: { label: "Ativo agora", className: "badge badge-ice" },
  encerrado: { label: "Encerrado", className: "badge" },
};

export default function AdminGachaEventoPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [event, setEvent] = useState<ClaimEvent | null>(null);
  const [original, setOriginal] = useState<ClaimEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { motivo, setMotivo, confirming, setConfirming, motivoError } =
    useSensitiveWrite();

  /** O PATCH exige SUPERADMIN (gacha.controller.ts); esconder o botão evita o erro cru. */
  const canEdit = user?.role === "SUPERADMIN";
  const dirty =
    event !== null && original !== null && JSON.stringify(event) !== JSON.stringify(original);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await api.adminGachaConfig();
      const entry = entries.find((item) => item.key === "claim_event");
      const parsed = entry
        ? { ...EMPTY_EVENT, ...(entry.value as Partial<ClaimEvent>) }
        : EMPTY_EVENT;
      setEvent(parsed);
      setOriginal(parsed);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Erro ao carregar evento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 1 Hz só para o badge de fase — barato e mantém "Ativo agora" honesto.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const phase = useMemo(
    () => (event ? phaseOf(event, now) : "desligado"),
    [event, now],
  );

  function patch(partial: Partial<ClaimEvent>) {
    setEvent((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  /** Atalho: janela de 7 dias começando agora (o evento desliga sozinho no fim). */
  function presetSemana() {
    const start = new Date();
    const end = new Date(start.getTime() + 7 * 86_400_000);
    patch({
      active: true,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
    });
  }

  function revert() {
    if (original) setEvent({ ...original });
    setMotivo("");
    setFieldError("");
  }

  function requestSave() {
    if (!event || saving) return;
    setFieldError("");
    const startsAt = event.startsAt;
    const endsAt = event.endsAt;
    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
      setFieldError("Encerramento deve ser depois do início.");
      return;
    }
    if (motivoError) {
      setFieldError(motivoError);
      return;
    }
    setConfirming(true);
  }

  async function save() {
    if (!event || saving) return;
    setSaving(true);
    try {
      await api.adminUpdateGachaConfig(
        "claim_event",
        {
          active: event.active,
          name: event.name,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          spinsPerHour: event.spinsPerHour,
        },
        motivo.trim(),
      );
      setConfirming(false);
      setMotivo("");
      setFieldError("");
      toast("Evento salvo.", "success");
      await load();
    } catch (e) {
      setFieldError(e instanceof ApiError ? e.message : "Erro ao salvar evento.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="skeleton h-64" aria-busy="true" />
      </div>
    );
  }

  const badge = PHASE_BADGE[phase];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-display-xl text-snow">Evento do Gacha</h1>
        <GachaAdminTabs current="/admin/gacha/evento" />
      </div>
      <p className="mt-2 max-w-2xl text-body-sm text-mist">
        Durante a janela, cada resgate aplica cooldown de 1 hora,
        independente da raridade. Um cooldown que já esteja ativo continua
        valendo. O evento desliga sozinho no fim da janela.
      </p>

      {loadError && (
        <p
          role="alert"
          className="mt-3 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
        >
          {loadError}
        </p>
      )}

      {!event && (
        <p className="mt-4 border border-hairline bg-panel p-3 text-body-sm text-mist">
          Chave <span className="font-mono text-caption">claim_event</span> ainda
          não existe. Rode a migration 20261117210000 e recarregue.
        </p>
      )}

      {event && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`badge ${badge.className}`}>{badge.label}</span>
            <span className="font-mono text-caption text-mist">
              {formatLocal(event.startsAt)} → {formatLocal(event.endsAt)}
            </span>
          </div>

          {!canEdit && (
            <p className="mt-4 border border-hairline bg-panel p-3 text-body-sm text-mist">
              Você pode conferir, mas só contas superadmin alteram o evento.
            </p>
          )}

          <div className="mt-6 grid gap-5">
            <label className="grid gap-1.5" htmlFor="evento-nome">
              <span className="font-sans text-caption uppercase tracking-wider text-mist">
                Nome do evento
              </span>
              <input
                id="evento-nome"
                type="text"
                className="field"
                value={event.name}
                disabled={!canEdit}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5" htmlFor="evento-inicio">
                <span className="font-sans text-caption uppercase tracking-wider text-mist">
                  Início
                </span>
                <input
                  id="evento-inicio"
                  type="datetime-local"
                  className="field"
                  value={isoToLocalInput(event.startsAt)}
                  disabled={!canEdit}
                  onChange={(e) =>
                    patch({ startsAt: localInputToIso(e.target.value) })
                  }
                />
              </label>
              <label className="grid gap-1.5" htmlFor="evento-fim">
                <span className="font-sans text-caption uppercase tracking-wider text-mist">
                  Encerramento
                </span>
                <input
                  id="evento-fim"
                  type="datetime-local"
                  className="field"
                  value={isoToLocalInput(event.endsAt)}
                  disabled={!canEdit}
                  onChange={(e) =>
                    patch({ endsAt: localInputToIso(e.target.value) })
                  }
                />
              </label>
            </div>

            {canEdit && (
              <button
                type="button"
                className="btn-ghost w-fit px-3 py-2 text-caption"
                onClick={presetSemana}
              >
                Semana a partir de agora
              </button>
            )}


            <label className="grid gap-1.5 sm:max-w-xs" htmlFor="evento-spins">
              <span className="font-sans text-caption uppercase tracking-wider text-mist">
                Previews por hora durante o evento
              </span>
              <input
                id="evento-spins"
                type="number"
                min={1}
                className="field"
                placeholder="vazio = usa o global (5)"
                value={event.spinsPerHour ?? ""}
                disabled={!canEdit}
                onChange={(e) =>
                  patch({
                    spinsPerHour:
                      e.target.value === ""
                        ? null
                        : Math.max(1, Math.trunc(Number(e.target.value))),
                  })
                }
              />
            </label>

            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-ice"
                checked={event.active}
                disabled={!canEdit}
                onChange={(e) => patch({ active: e.target.checked })}
              />
              <span className="text-body-sm text-snow">
                Evento habilitado
                <span className="text-caption text-mist">
                  {" "}
                  — vale só dentro da janela de datas
                </span>
              </span>
            </label>

            {canEdit && (
              <ReasonField
                id="evento-motivo"
                value={motivo}
                onChange={setMotivo}
              />
            )}
          </div>

          {fieldError && (
            <p
              role="alert"
              className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
            >
              {fieldError}
            </p>
          )}

          {canEdit && (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-ice px-5 py-3"
                disabled={saving || !dirty}
                onClick={requestSave}
              >
                {saving ? "Salvando…" : "Salvar evento"}
              </button>
              <button
                type="button"
                className="btn-ghost px-5 py-3"
                disabled={saving || !dirty}
                onClick={revert}
              >
                Reverter
              </button>
            </div>
          )}

          <SensitiveWriteDialog
            open={confirming}
            busy={saving}
            title="Aplicar evento para todo mundo?"
            entryKey="claim_event"
            before={original ? JSON.stringify(original) : ""}
            after={event ? JSON.stringify(event) : ""}
            onCancel={() => setConfirming(false)}
            onConfirm={() => void save()}
          />
        </>
      )}
    </div>
  );
}
