"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Header } from "@/components/common/Header";
import { SiteNav } from "@/components/common/SiteNav";
import { Footer } from "@/components/common/Footer";
import { AdminGate } from "@/components/common/AdminGate";
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
  USER: "Usuário",
  ANIME: "Anime",
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
  const [moderateAction, setModerateAction] = useState<"WARN" | "MUTE" | "BAN" | "DELETE_CONTENT">("WARN");
  const [moderateReason, setModerateReason] = useState("");
  const [moderateHours, setModerateHours] = useState("");
  const [moderateMsg, setModerateMsg] = useState("");

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

  async function handleModerateUser() {
    if (!moderateUserModal) return;
    setActioning(moderateUserModal);
    setModerateMsg("");
    try {
      const body: { actionType: typeof moderateAction; reason?: string; hours?: number } = {
        actionType: moderateAction,
      };
      if (moderateReason) body.reason = moderateReason;
      if (moderateHours) body.hours = parseInt(moderateHours, 10);
      await api.adminModerateUser(moderateUserModal, body);
      setModerateMsg("Ação aplicada com sucesso.");
      setModerateUserModal(null);
      setModerateReason("");
      setModerateHours("");
    } catch (e) {
      setModerateMsg(e instanceof ApiError ? e.message : "Erro ao aplicar ação.");
    } finally {
      setActioning(null);
    }
  }

  return (
    <AdminGate>
      <Header />
      <SiteNav />
      <main className="mx-auto max-w-shelf px-4 py-6">
        <h1 className="font-display text-display-xl text-snow">Moderação</h1>
        <p className="mt-1 text-body-sm text-mist">
          Gerenciar denúncias e aplicar ações a usuários.
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
              className={`px-3 py-1.5 font-mono text-caption uppercase tracking-wider transition-colors ${
                statusFilter === s
                  ? "border border-ice text-ice"
                  : "border border-hairline text-mist hover:text-ice"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="text-body-sm text-mist">Carregando denúncias...</p>
          ) : reports.length === 0 ? (
            <p className="text-body-sm text-mist">Nenhuma denúncia encontrada.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="border border-hairline bg-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="border border-hairline px-2 py-0.5 font-mono text-caption uppercase tracking-wider text-mist">
                          {TARGET_LABELS[report.targetType] ?? report.targetType}
                        </span>
                        <span className="border border-hairline px-2 py-0.5 font-mono text-caption uppercase tracking-wider text-mist">
                          {REASON_LABELS[report.reason] ?? report.reason}
                        </span>
                        <span
                          className={`px-2 py-0.5 font-mono text-caption uppercase tracking-wider ${
                            report.status === "PENDING"
                              ? "text-ice"
                              : report.status === "RESOLVED"
                                ? "text-ice/60"
                                : "text-signal"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>
                      <p className="mt-2 text-body-sm text-ice">
                        Alvo: <code className="text-mist">{report.targetId}</code>
                      </p>
                      {report.notes && (
                        <p className="mt-1 text-body-sm text-mist">{report.notes}</p>
                      )}
                      <p className="mt-2 font-mono text-caption text-mist">
                        Denunciante: {report.reporter.userName ?? report.reporter.name ?? "—"} · {new Date(report.createdAt).toLocaleString("pt-BR")}
                      </p>
                      {report.moderator && (
                        <p className="font-mono text-caption text-mist">
                          Moderador: {report.moderator.userName ?? report.moderator.name ?? "—"} · {new Date(report.resolvedAt ?? "").toLocaleString("pt-BR")}
                        </p>
                      )}
                      {report.moderationNote && (
                        <p className="mt-1 text-body-sm text-mist">
                          Nota: {report.moderationNote}
                        </p>
                      )}
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

                  {report.targetType === "USER" && report.status === "PENDING" && (
                    <div className="mt-3 border-t border-hairline pt-3">
                      <button
                        onClick={() => {
                          setModerateUserModal(report.targetId);
                          setModerateMsg("");
                        }}
                        className="text-caption text-ice hover:opacity-70"
                      >
                        Aplicar ação de moderação ao usuário
                      </button>
                    </div>
                  )}

                  {report.targetType === "COMMENT" && report.status === "PENDING" && (
                    <div className="mt-3 border-t border-hairline pt-3">
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
                        className="text-caption text-signal hover:opacity-70"
                      >
                        Ocultar comentário
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="mt-4 text-caption text-mist">
          Logado como <span className="text-ice">{user?.email}</span> ({user?.role})
        </p>
      </main>

      {noteModal && (
        <Modal onClose={() => setNoteModal(null)}>
          <h2 className="font-display text-display-lg text-snow">
            {noteModal.action === "resolve" ? "Resolver denúncia" : "Rejeitar denúncia"}
          </h2>
          <p className="mt-1 text-body-sm text-mist">
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
            <button onClick={handleAction} disabled={actioning === noteModal.reportId} className="btn-ice">
              {actioning === noteModal.reportId ? "Processando..." : "Confirmar"}
            </button>
            <button onClick={() => setNoteModal(null)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {moderateUserModal && (
        <Modal onClose={() => setModerateUserModal(null)}>
          <h2 className="font-display text-display-lg text-snow">Moderar usuário</h2>
          <p className="mt-1 text-body-sm text-mist">
            Usuário: <code className="text-ice">{moderateUserModal}</code>
          </p>

          {moderateMsg && (
            <div className={`mt-3 border p-3 text-body-sm ${moderateMsg.includes("sucesso") ? "border-ice/40 bg-ice/10 text-ice" : "border-signal/40 bg-signal/10 text-signal"}`}>
              {moderateMsg}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div>
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                Ação
              </span>
              <select
                value={moderateAction}
                onChange={(e) => setModerateAction(e.target.value as typeof moderateAction)}
                className="field"
              >
                <option value="WARN">Advertência</option>
                <option value="MUTE">Silenciar</option>
                <option value="BAN">Banir</option>
                <option value="DELETE_CONTENT">Deletar conteúdo</option>
              </select>
            </div>
            <div>
              <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                Motivo
              </span>
              <input
                type="text"
                value={moderateReason}
                onChange={(e) => setModerateReason(e.target.value)}
                placeholder="Motivo da ação..."
                className="field"
              />
            </div>
            {(moderateAction === "MUTE" || moderateAction === "BAN") && (
              <div>
                <span className="mb-1.5 block font-sans text-caption uppercase tracking-wider text-mist">
                  Duração (horas) — vazio = permanente
                </span>
                <input
                  type="number"
                  value={moderateHours}
                  onChange={(e) => setModerateHours(e.target.value)}
                  placeholder="ex: 24"
                  className="field"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={handleModerateUser} disabled={actioning === moderateUserModal} className="btn-ice">
              {actioning === moderateUserModal ? "Aplicando..." : "Aplicar"}
            </button>
            <button onClick={() => setModerateUserModal(null)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      <Footer />
    </AdminGate>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-hairline bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
