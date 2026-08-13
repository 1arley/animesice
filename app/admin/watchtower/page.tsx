"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import type { WatchtowerStatus } from "@/lib/api";

export default function AdminWatchtowerPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<WatchtowerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [checkSlug, setCheckSlug] = useState("");
  const [scanForce, setScanForce] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.watchtowerStatus();
      setStatus(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPrivileged(user)) return;
    loadStatus();
  }, [user, loadStatus]);

  async function runAction(
    label: string,
    fn: () => Promise<{ data: unknown; msg: string }>,
  ) {
    setActioning(true);
    setActionMsg(null);
    setError(null);
    try {
      const { msg } = await fn();
      setActionMsg(msg);
      await loadStatus();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `Erro ao executar ${label}.`);
    } finally {
      setActioning(false);
    }
  }

  async function handleCheck() {
    if (!checkSlug.trim()) return;
    await runAction("check", async () => {
      const data = await api.watchtowerCheck(checkSlug.trim());
      return { data, msg: `Check: ${data.anime} — ${data.enqueued ? "enfileirado" : "não enfileirado"}` };
    });
  }

  async function handleRetry(jobId: string) {
    await runAction("retry", async () => {
      const res = await api.watchtowerRetryJob(jobId);
      return { data: res, msg: res.ok ? `Job ${jobId} reenfileirado.` : `Falha ao reenfileirar ${jobId}.` };
    });
  }

  async function handleToggleSource(sourceId: string, currentlyDisabled: boolean) {
    await runAction("toggle", async () => {
      const res = await api.watchtowerToggleSource(sourceId, !currentlyDisabled);
      return { data: res, msg: `Fonte ${sourceId}: ${res.disabled ? "desativada" : "ativada"}.` };
    });
  }

  async function handleDiscover() {
    await runAction("discover", async () => {
      const res = await api.watchtowerDiscover();
      return { data: res, msg: `Temporada: ${res.created} anime(s) descoberto(s).` };
    });
  }

  async function handleRepair() {
    await runAction("repair", async () => {
      const res = await api.watchtowerRepair();
      return { data: res, msg: `Reparo: ${res.enqueued} job(s) enfileirado(s).` };
    });
  }

  async function handleScanAll() {
    await runAction("scan-all", async () => {
      const res = await api.watchtowerScanAll(scanForce);
      return { data: res, msg: `Scan: ${res.enqueued} enfileirado(s), ${res.skipped} pulado(s).` };
    });
  }

  const isSuperadmin = user?.role === "SUPERADMIN";

  if (!isSuperadmin) {
    return (
      <div className="mt-2 border border-signal/40 bg-signal/10 p-4 text-body-sm text-signal">
        Acesso restrito a SUPERADMIN.
      </div>
    );
  }

  const jobStats = status?.jobs;
  const jobCards = jobStats
    ? [
        { label: "Pendentes", value: jobStats.pending, color: "text-snow" },
        { label: "Rodando", value: jobStats.running, color: "text-ice" },
        { label: "Concluídos", value: jobStats.completed, color: "text-ice/60" },
        { label: "Falhados", value: jobStats.failed, color: "text-signal" },
        { label: "Mortos", value: jobStats.dead, color: "text-signal" },
      ]
    : [];

  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-display text-display-xl text-snow">Watchtower</h1>
        <span className="badge badge-ice">
          <span className="badge-dot bg-ice animate-blink" />
          Monitoramento
        </span>
      </div>
      <p className="text-body-sm text-mist">
        Fila de jobs, fontes de conteúdo e operações de varredura.
      </p>

      {error && (
        <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      {actionMsg && (
        <div className="mt-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="admin-empty mt-4">Carregando status...</div>
      ) : !status ? null : (
        <>
          {/* Fila de jobs */}
          <section className="mt-6">
            <h2 className="shelf-label">Fila de Jobs</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {jobCards.map((c) => (
                <div key={c.label} className="admin-stat">
                  <p className="font-mono text-caption uppercase tracking-wider text-mist">
                    {c.label}
                  </p>
                  <p className={`mt-1.5 font-display text-display-lg tabular-nums ${c.color}`}>
                    {c.value.toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Fontes de conteúdo */}
          <section className="mt-6">
            <h2 className="shelf-label">Fontes de Conteúdo</h2>
            {status.sources.length === 0 ? (
              <div className="admin-empty">Nenhuma fonte cadastrada.</div>
            ) : (
              <div className="mt-4 overflow-x-auto border border-hairline">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Source ID</th>
                      <th>Estado</th>
                      <th>Falhas</th>
                      <th>Último check</th>
                      <th>Erro</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.sources.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <code className="text-mist">{s.sourceId}</code>
                        </td>
                        <td>
                          {s.disabled ? (
                            <span className="badge badge-signal">
                              <span className="badge-dot bg-signal" />
                              Desativada
                            </span>
                          ) : (
                            <span className="badge badge-ice">
                              <span className="badge-dot bg-ice" />
                              Ativa
                            </span>
                          )}
                        </td>
                        <td className={`tabular-nums ${s.consecutiveFailures > 0 ? "text-signal" : "text-mist"}`}>
                          {s.consecutiveFailures}
                        </td>
                        <td className="text-caption text-mist">
                          {s.lastCheckedAt
                            ? new Date(s.lastCheckedAt).toLocaleString("pt-BR")
                            : "—"}
                        </td>
                        <td className="max-w-xs">
                          {s.lastError ? (
                            <span className="text-caption text-signal" title={s.lastError}>
                              {s.lastError.length > 60
                                ? s.lastError.slice(0, 60) + "..."
                                : s.lastError}
                            </span>
                          ) : (
                            <span className="text-mist">—</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleSource(s.sourceId, s.disabled)}
                            disabled={actioning}
                            className="btn-ghost btn-sm"
                          >
                            {s.disabled ? "Ativar" : "Desativar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Operações */}
          <section className="mt-6">
            <h2 className="shelf-label">Operações manuais</h2>

            {/* Verificar anime */}
            <div className="admin-card mt-3 p-4">
              <h3 className="font-mono text-caption uppercase tracking-wider text-mist">
                Verificar lançamentos de um anime
              </h3>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={checkSlug}
                  onChange={(e) => setCheckSlug(e.target.value)}
                  placeholder="slug do anime..."
                  className="field flex-1"
                />
                <button
                  onClick={handleCheck}
                  disabled={actioning || !checkSlug.trim()}
                  className="btn-ice"
                >
                  {actioning ? "..." : "Forçar check"}
                </button>
              </div>
            </div>

            {/* Varredura de catálogo */}
            <div className="admin-card mt-3 p-4">
              <h3 className="font-mono text-caption uppercase tracking-wider text-mist">
                Escanear catálogo de todos os animes
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scanForce}
                    onChange={(e) => setScanForce(e.target.checked)}
                    className="h-4 w-4 accent-ice"
                  />
                  <span className="text-body-sm text-mist">
                    Forçar (ignorar cache)
                  </span>
                </label>
                <button
                  onClick={handleScanAll}
                  disabled={actioning}
                  className="btn-ice"
                >
                  {actioning ? "..." : "Escanear tudo"}
                </button>
              </div>
            </div>

            {/* Descoberta de temporada */}
            <div className="admin-card mt-3 p-4">
              <h3 className="font-mono text-caption uppercase tracking-wider text-mist">
                Descoberta de temporada
              </h3>
              <p className="mt-1 text-caption text-mist">
                Busca novos episódios/temporadas nas fontes.
              </p>
              <button
                onClick={handleDiscover}
                disabled={actioning}
                className="btn-ice mt-3"
              >
                {actioning ? "..." : "Forçar descoberta"}
              </button>
            </div>

            {/* Varredura de reparo */}
            <div className="admin-card mt-3 p-4">
              <h3 className="font-mono text-caption uppercase tracking-wider text-mist">
                Varredura de reparo
              </h3>
              <p className="mt-1 text-caption text-mist">
                Verifica episódios sem vídeo e tenta re-obter fonte.
              </p>
              <button
                onClick={handleRepair}
                disabled={actioning}
                className="btn-ice mt-3"
              >
                {actioning ? "..." : "Forçar reparo"}
              </button>
            </div>
          </section>
        </>
      )}
    </>
  );
}
