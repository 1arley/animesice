"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import { Modal as SharedModal } from "@/components/common/Modal";
import type { SiteFeedbackItem, Paginated, FeedbackStatus, FeedbackType } from "@/types";

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, string> = {
  ALL: "Todos",
  SUGGESTION: "Sugestões",
  BUG: "Bugs",
  REQUEST: "Pedidos",
};

const STATUS_LABELS: Record<string, string> = {
  ALL: "Todos",
  OPEN: "Em aberto",
  ACKNOWLEDGED: "Reconhecido",
  RESOLVED: "Resolvido",
  COMPLETED: "Concluído",
  WONT_FIX: "Não será corrigido",
  REJECTED: "Rejeitado",
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: "badge-ice",
  ACKNOWLEDGED: "badge-ice",
  RESOLVED: "badge-ice",
  COMPLETED: "badge-ice",
  WONT_FIX: "badge-muted",
  REJECTED: "badge-signal",
};

export default function AdminFeedbacksPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SiteFeedbackItem[]>([]);
  const [meta, setMeta] = useState<Paginated<SiteFeedbackItem>["meta"] | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<SiteFeedbackItem | null>(null);
  const [newStatus, setNewStatus] = useState<FeedbackStatus>("OPEN");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listFeedback(
        page,
        PAGE_SIZE,
        typeFilter === "ALL" ? undefined : typeFilter,
        statusFilter === "ALL" ? undefined : statusFilter,
      );
      setItems(res.data);
      setMeta(res.meta);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar feedbacks.");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    if (!isPrivileged(user)) return;
    loadItems();
  }, [user, loadItems]);

  async function updateStatus() {
    if (!actionModal) return;
    setSaving(true);
    try {
      await api.adminUpdateFeedback(actionModal.id, newStatus, adminNote || undefined);
      setActionModal(null);
      setAdminNote("");
      await loadItems();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao atualizar feedback.");
    } finally {
      setSaving(false);
    }
  }

  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-display text-display-xl text-snow">Feedbacks</h1>
        <span className="badge badge-muted">
          <span className="badge-dot bg-ice" />
          {total} total
        </span>
      </div>
      <p className="text-body-sm text-mist">
        Sugestões, bugs e pedidos enviados pela comunidade.
      </p>

      {error && (
        <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTypeFilter(key); setPage(1); }}
              className={`admin-tab ${typeFilter === key ? "admin-tab-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setPage(1); }}
              className={`admin-tab ${statusFilter === key ? "admin-tab-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-empty mt-4">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="admin-empty mt-4">Nenhum feedback encontrado.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="admin-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-muted">
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    <span className={`badge ${STATUS_BADGE[item.status] ?? "badge-muted"}`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    <span className="font-mono text-caption text-mist">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {item.title && (
                    <p className="mt-2 text-body-md font-medium text-snow">{item.title}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap break-words text-body-sm text-mist">
                    {item.description}
                  </p>
                  {item.adminNote && (
                    <div className="mt-2 border-l-2 border-ice/30 pl-3 text-body-sm text-mist">
                      <span className="font-mono text-caption uppercase tracking-wider text-ice/60">Nota: </span>
                      {item.adminNote}
                    </div>
                  )}
                  <p className="mt-2 font-mono text-caption text-mist">
                    Por: {item.user.userName ?? item.user.name ?? "—"} · {item.upvotes} upvotes
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActionModal(item);
                    setNewStatus(item.status);
                    setAdminNote(item.adminNote ?? "");
                  }}
                  className="btn-ghost"
                >
                  Gerenciar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Paginação">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>
          <span className="font-display text-body-sm text-mist tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Próxima →
          </button>
        </nav>
      )}

      {actionModal && (
        <SharedModal
          open={!!actionModal}
          onClose={() => setActionModal(null)}
          title="Gerenciar feedback"
        >
          <p className="text-body-md font-medium text-snow">{actionModal.title}</p>
          <p className="mt-2 whitespace-pre-wrap text-body-sm text-mist">{actionModal.description}</p>

          <div className="mt-4 space-y-3">
            <div>
              <span className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
                Status
              </span>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as FeedbackStatus)}
                className="field"
              >
                <option value="OPEN">Em aberto</option>
                <option value="ACKNOWLEDGED">Reconhecido</option>
                <option value="RESOLVED">Resolvido</option>
                <option value="COMPLETED">Concluído</option>
                <option value="WONT_FIX">Não será corrigido</option>
                <option value="REJECTED">Rejeitado</option>
              </select>
            </div>
            <div>
              <span className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
                Nota do admin
              </span>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Nota interna..."
                rows={3}
                className="field"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={updateStatus} disabled={saving} className="btn-ice">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={() => setActionModal(null)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </SharedModal>
      )}
    </>
  );
}
