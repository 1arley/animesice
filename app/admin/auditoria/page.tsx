"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import type { AuditLogItem } from "@/lib/api";

const RESOURCE_TYPES = ["User", "AdminAuditLog", "Report", "ModerationAction"];

const LOAD_TIMEOUT_MS = 15000;

export default function AdminAuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resourceType, setResourceType] = useState("User");
  const [days, setDays] = useState(7);
  const abortRef = useRef<AbortController | null>(null);

  const loadLogs = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminGetSensitiveAccess(
        resourceType,
        days,
        controller.signal,
      );
      setLogs(data);
    } catch (e) {
      // Request substituído por um novo load ou abortado no unmount — o estado
      // já é/reunido pelo dono atual; não sobrescreve nada.
      if (abortRef.current !== controller) return;
      if (controller.signal.aborted) {
        setError("Tempo esgotado ao carregar logs.");
      } else {
        setError(e instanceof ApiError ? e.message : "Erro ao carregar logs.");
      }
    } finally {
      clearTimeout(timer);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, [resourceType, days]);

  useEffect(() => {
    if (!isPrivileged(user)) return;
    loadLogs();
  }, [user, loadLogs]);

  // Aborta request pendente ao desmontar — evita setState após unmount.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      abortRef.current = null;
    },
    [],
  );

  const isSuperadmin = user?.role === "SUPERADMIN";

  if (!isSuperadmin) {
    return (
      <div className="mt-2 border border-signal/40 bg-signal/10 p-4 text-body-sm text-signal">
        Acesso restrito a SUPERADMIN.
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-display text-display-xl text-snow">Auditoria</h1>
        <span className="badge badge-muted">
          <span className="badge-dot bg-ice" />
          {logs.length} registros
        </span>
      </div>
      <p className="text-body-sm text-mist">
        Logs de acesso a dados sensíveis e ações administrativas.
      </p>

      {error && (
        <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <div>
          <label className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
            Recurso
          </label>
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="field"
          >
            {RESOURCE_TYPES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
            Período (dias)
          </label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="field"
          >
            {[1, 7, 14, 30, 90].map((d) => (
              <option key={d} value={d}>
                {d} {d === 1 ? "dia" : "dias"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-empty mt-4">Carregando logs...</div>
      ) : logs.length === 0 ? (
        <div className="admin-empty mt-4">Nenhum log encontrado no período.</div>
      ) : (
        <div className="mt-4 overflow-x-auto border border-hairline">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ação</th>
                <th>Recurso</th>
                <th>Admin</th>
                <th>Role</th>
                <th>IP</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="text-ice">{log.action}</td>
                  <td className="text-mist">{log.resourceType}</td>
                  <td className="text-snow">{log.admin?.email ?? "—"}</td>
                  <td>
                    <span className="badge badge-muted">{log.admin?.role ?? "—"}</span>
                  </td>
                  <td>
                    <code className="text-mist">{log.ipAddress ?? "—"}</code>
                  </td>
                  <td className="text-caption text-mist">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
