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
  OPEN: "Em aberto",
  ACKNOWLEDGED: "Reconhecido",
  RESOLVED: "Resolvido",
  COMPLETED: "Concluído",
  WONT_FIX: "Não será corrigido",
  REJECTED: "Rejeitado",
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

  return (
    <>
      <h1 className="font-display text-display-xl text-snow">Feedbacks</h1>
      <p className="mt-1 text-body-sm text-mist">
        Gerenciar sugestões, bugs e pedidos dos usuários.
      </p>

      {error && (
        <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTypeFilter(key); setPage(1); }}
            className={`px-3 py-1.5 font-mono text-caption uppercase tracking-wider transition-colors ${
              typeFilter === key
                ? "border border-ice text-ice"
                : "border border-hairline text-mist hover:text-ice"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(1); }}
            className={`px-3 py-1.5 font-mono text-caption uppercase tracking-wider transition-colors ${
              statusFilter === key
                ? "border border-ice text-ice"
                : "border border-hairline text-mist hover:text-ice"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-4 text-body-sm text-mist">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-body-sm text-mist">Nenhum feedback encontrado.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="border border-hairline bg-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="border border-hairline px-2 py-0.5 font-mono text-caption uppercase text-mist">
                      {item.type}
                    </span>
                    <span className={`font-mono text-caption uppercase ${
                      item.status === "OPEN" ? "text-ice" : item.status === "COMPLETED" ? "text-ice/60" : "text-signal/60"
                    }`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    <span className="font-mono text-caption text-mist">
                      {item.upvotes} upvotes
                    </span>
                    <span className="font-mono text-caption text-mist">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-2 text-body-md text-snow">{item.title}</p>
                  <p className="mt-1 text-body-sm text-mist whitespace-pre-wrap break-words">
                    {item.description}
                  </p>
                  {item.adminNote && (
                    <p className="mt-1 text-body-sm text-ice/60">Nota admin: {item.adminNote}</p>
                  )}
                  <p className="mt-2 font-mono text-caption text-mist">
                    Por: {item.user.userName ?? item.user.name ?? "—"}
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
          <p className="text-body-md text-snow">{actionModal.title}</p>
          <p className="mt-1 text-caption text-mist">
            Tipo: {actionModal.type} · {actionModal.upvotes} upvotes
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
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
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
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