"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Modal as SharedModal } from "@/components/common/Modal";
import type { ReportItem, ReportStatusType } from "@/types";

const STATUS_LABELS: Record<ReportStatusType | "ALL", string> = {
  ALL: "Todas",
  PENDING: "Pendentes",
  RESOLVED: "Resolvidas",
  DISMISSED: "Rejeitadas",
};

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  HARASSMENT: "Assédio",
  NSFW: "NSFW",
  SPOILER: "Spoiler",
  ILLEGAL: "Ilegal",
  OTHER: "Outro",
};

const TARGET_LABELS: Record<string, string> = {
  COMMENT: "Comentário",
  CHAT_MESSAGE: "Chat",
  ROOM_MESSAGE: "Sala",
  USER: "Usuário",
  ANIME: "Anime",
  POST: "Post",
  POST_COMMENT: "Comentário de Post",
};

type ModerateAction = "WARN" | "MUTE" | "BAN" | "DELETE_CONTENT";

const ACTION_LABELS: Record<ModerateAction, string> = {
  WARN: "Advertência",
  MUTE: "Silenciar",
  BAN: "Banir",
  DELETE_CONTENT: "Deletar conteúdo",
};

export default function ModerationPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatusType | "ALL">("ALL");
  const [actioning, setActioning] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<{ reportId: string; action: "resolve" | "dismiss" } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [moderateUserModal, setModerateUserModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminListReports(1, 100, statusFilter === "ALL" ? undefined : statusFilter);
      setReports(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao carregar denúncias.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function handleAction() {
    if (!noteModal) return;
    setActioning(noteModal.reportId);
    try {
      if (noteModal.action === "resolve") {
        await api.adminResolveReport(noteModal.reportId, noteText || undefined);
      } else {
        await api.adminDismissReport(noteModal.reportId, noteText || undefined);
      }
      setNoteModal(null);
      setNoteText("");
      await loadReports();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao processar.");
    } finally {
      setActioning(null);
    }
  }

  async function handleModerateUser(action: ModerateAction, reason: string, hours: string) {
    if (!moderateUserModal) return;
    setSaving(true);
    try {
      const body: { actionType: ModerateAction; reason?: string; hours?: number } = {
        actionType: action,
      };
      if (reason) body.reason = reason;
      if (hours) body.hours = parseInt(hours, 10);
      await api.adminModerateUser(moderateUserModal, body);
      setModerateUserModal(null);
      await loadReports();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao aplicar ação.");
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = reports.filter(r => r.status === "PENDING").length;

  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-display text-display-xl text-snow">Moderação</h1>
        {pendingCount > 0 && (
          <span className="badge badge-signal">
            <span className="badge-dot bg-signal animate-blink" />
            {pendingCount} pendentes
          </span>
        )}
      </div>
      <p className="text-body-sm text-mist">
        Denúncias e ações de moderação de usuários.
      </p>

      {error && (
        <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABELS) as (ReportStatusType | "ALL")[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`admin-tab ${statusFilter === s ? "admin-tab-active" : ""}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="admin-empty">Carregando denúncias...</div>
        ) : reports.length === 0 ? (
          <div className="admin-empty">Nenhuma denúncia encontrada.</div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="admin-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge badge-muted">
                        {TARGET_LABELS[report.targetType] ?? report.targetType}
                      </span>
                      <span className="badge badge-muted">
                        {REASON_LABELS[report.reason] ?? report.reason}
                      </span>
                      {report.status === "PENDING" ? (
                        <span className="badge badge-signal">
                          <span className="badge-dot bg-signal">
                          </span>
                          Pendente
                        </span>
                      ) : report.status === "RESOLVED" ? (
                        <span className="badge badge-ice">
                          <span className="badge-dot bg-ice" />
                          Resolvido
                        </span>
                      ) : (
                        <span className="badge badge-muted">
                          <span className="badge-dot bg-mist" />
                          Rejeitado
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5 space-y-1">
                      <p className="text-body-sm text-ice">
                        Alvo: <code className="text-mist">{report.targetId}</code>
                      </p>
                      {report.notes && (
                        <p className="text-body-sm text-mist">{report.notes}</p>
                      )}
                      <p className="font-mono text-caption text-mist">
                        Denunciante: {report.reporter.userName ?? report.reporter.name ?? "—"} · {new Date(report.createdAt).toLocaleString("pt-BR")}
                      </p>
                      {report.moderator && (
                        <p className="font-mono text-caption text-mist">
                          Moderador: {report.moderator.userName ?? report.moderator.name ?? "—"} · {new Date(report.resolvedAt ?? "").toLocaleString("pt-BR")}
                        </p>
                      )}
                      {report.moderationNote && (
                        <div className="mt-2 border-l-2 border-ice/30 pl-3 text-body-sm text-mist">
                          <span className="font-mono text-caption uppercase tracking-wider text-ice/60">Nota: </span>
                          {report.moderationNote}
                        </div>
                      )}
                    </div>
                  </div>

                  {report.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setNoteModal({ reportId: report.id, action: "resolve" });
                          setNoteText("");
                        }}
                        disabled={actioning === report.id}
                        className="btn-ice"
                      >
                        Resolver
                      </button>
                      <button
                        onClick={() => {
                          setNoteModal({ reportId: report.id, action: "dismiss" });
                          setNoteText("");
                        }}
                        disabled={actioning === report.id}
                        className="btn-ghost"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>

                {report.status === "PENDING" && (
                  <div className="mt-3 border-t border-hairline pt-3">
                    {report.targetType === "USER" && (
                      <button
                        onClick={() => setModerateUserModal(report.targetId)}
                        className="btn-danger btn-sm"
                      >
                        Moderar usuário
                      </button>
                    )}
                    {(report.targetType === "COMMENT" || report.targetType === "POST_COMMENT") && (
                      <button
                        onClick={async () => {
                          setActioning(report.id);
                          try {
                            await api.adminDeleteComment(report.targetId);
                            await loadReports();
                          } catch (e) {
                            setError(e instanceof ApiError ? e.message : "Erro ao ocultar comentário.");
                          } finally {
                            setActioning(null);
                          }
                        }}
                        disabled={actioning === report.id}
                        className="btn-danger btn-sm"
                      >
                        {actioning === report.id ? "..." : "Ocultar comentário"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 text-caption text-mist">
        Logado como <span className="text-ice">{user?.email}</span> ({user?.role})
      </p>

      {noteModal && (
        <SharedModal
          open={!!noteModal}
          onClose={() => setNoteModal(null)}
          title={noteModal.action === "resolve" ? "Resolver denúncia" : "Rejeitar denúncia"}
        >
          <p className="text-body-sm text-mist">
            Opcionalmente adicione uma nota de moderação.
          </p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Nota do moderador..."
            rows={3}
            className="field mt-4"
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleAction}
              disabled={actioning === noteModal.reportId}
              className={noteModal.action === "resolve" ? "btn-ice" : "btn-ghost"}
            >
              {actioning === noteModal.reportId ? "Processando..." : "Confirmar"}
            </button>
            <button onClick={() => setNoteModal(null)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </SharedModal>
      )}

      {moderateUserModal && (
        <ModerateUserInline
          userId={moderateUserModal}
          onClose={() => setModerateUserModal(null)}
          onSubmit={handleModerateUser}
          saving={saving}
        />
      )}
    </>
  );
}

function ModerateUserInline({
  userId,
  onClose,
  onSubmit,
  saving,
}: {
  userId: string;
  onClose: () => void;
  onSubmit: (action: ModerateAction, reason: string, hours: string) => void;
  saving: boolean;
}) {
  const [action, setAction] = useState<ModerateAction>("WARN");
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("");

  return (
    <SharedModal open={!!userId} onClose={onClose} title="Moderar usuário">
      <p className="text-body-sm text-mist">
        ID: <code className="text-ice">{userId}</code>
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <span className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
            Ação
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(["WARN", "MUTE", "BAN", "DELETE_CONTENT"] as ModerateAction[]).map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                className={`border px-3 py-2 text-left transition-colors ${
                  action === a
                    ? a === "BAN"
                      ? "border-signal bg-signal/5 text-signal"
                      : "border-ice bg-ice/5 text-ice"
                    : "border-hairline text-mist hover:border-ice/40 hover:text-ice"
                }`}
              >
                <p className="font-mono text-caption uppercase tracking-wider">
                  {ACTION_LABELS[a]}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
            Motivo
          </span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo da ação..."
            className="field"
          />
        </div>

        {(action === "MUTE" || action === "BAN") && (
          <div>
            <span className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist">
              Duração (horas) — vazio = permanente
            </span>
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="ex: 24"
              className="field"
            />
            <div className="mt-1.5 flex gap-2">
              {[24, 168, 720].map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(String(h))}
                  className="admin-tab"
                >
                  {h === 24 ? "1 dia" : h === 168 ? "7 dias" : "30 dias"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => onSubmit(action, reason, hours)}
          disabled={saving}
          className={action === "BAN" ? "btn-danger" : "btn-ice"}
        >
          {saving ? "Aplicando..." : `Confirmar ${ACTION_LABELS[action]}`}
        </button>
        <button onClick={onClose} className="btn-ghost">
          Cancelar
        </button>
      </div>
    </SharedModal>
  );
}
