"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import { Modal as SharedModal } from "@/components/common/Modal";
import type { AdminUserListItem } from "@/lib/api";
import type { Paginated } from "@/types";

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  USER: "Usuário",
  ADMIN: "Admin",
  SUPERADMIN: "Super Admin",
};

const ROLE_BADGE: Record<string, string> = {
  USER: "badge-muted",
  ADMIN: "badge-ice",
  SUPERADMIN: "badge-ice",
};

type ModerateAction = "WARN" | "MUTE" | "BAN" | "DELETE_CONTENT";

const ACTION_LABELS: Record<ModerateAction, string> = {
  WARN: "Advertência",
  MUTE: "Silenciar",
  BAN: "Banir",
  DELETE_CONTENT: "Deletar conteúdo",
};

const ACTION_DESC: Record<ModerateAction, string> = {
  WARN: "Envia notificação de advertência. Não bloqueia acesso.",
  MUTE: "Silencia o usuário por um período. Não pode comentar/postar.",
  BAN: "Suspende totalmente. Não pode logar.",
  DELETE_CONTENT: "Apaga conteúdo recente do usuário.",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [meta, setMeta] = useState<Paginated<AdminUserListItem>["meta"] | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<AdminUserListItem | null>(null);
  const [moderateModal, setModerateModal] = useState<AdminUserListItem | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadUsers = useCallback(
    (targetPage: number, targetSearch: string) => {
      setLoading(true);
      api
        .adminListUsers(targetPage, PAGE_SIZE, targetSearch || undefined)
        .then((res) => {
          setUsers(res.data);
          setMeta(res.meta);
        })
        .catch((e) =>
          setError(e instanceof ApiError ? e.message : "Erro ao carregar usuários."),
        )
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    if (!isPrivileged(user)) return;
    loadUsers(page, search);
  }, [user, page]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadUsers(1, value);
    }, 350);
  }

  async function deleteUser(id: string) {
    setActioning(id);
    setError(null);
    try {
      await api.adminDeleteUser(id);
      setConfirmDelete(null);
      loadUsers(page, search);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao excluir usuário.");
    } finally {
      setActioning(null);
    }
  }

  async function changeRole(id: string, role: "USER" | "ADMIN" | "SUPERADMIN") {
    setActioning(id);
    try {
      await api.adminUpdateUserRole(id, role);
      setRoleModal(null);
      loadUsers(page, search);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao alterar cargo.");
    } finally {
      setActioning(null);
    }
  }

  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  return (
    <>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-display text-display-xl text-snow">Usuários</h1>
        <span className="badge badge-muted">
          <span className="badge-dot bg-ice" />
          {total} total
        </span>
      </div>
      <p className="text-body-sm text-mist">
        Buscar, alterar cargo, suspender e excluir usuários.
      </p>

      {error && (
        <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por email, nome ou apelido..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="field max-w-xs"
        />
      </div>

      {loading ? (
        <div className="admin-empty mt-4">Carregando...</div>
      ) : users.length === 0 ? (
        <div className="admin-empty mt-4">
          {search ? `Nenhum usuário encontrado para "${search}".` : "Nenhum usuário."}
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto border border-hairline">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nome</th>
                  <th>Cargo</th>
                  <th>Verificado</th>
                  <th>Status</th>
                  <th>Criado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSuspended = u.suspendedUntil && new Date(u.suspendedUntil) > new Date();
                  const isSelf = u.id === user?.id;
                  const canModify = !isSelf && u.role !== "SUPERADMIN";
                  const canDelete = !isSelf && u.role !== "SUPERADMIN";

                  return (
                    <tr key={u.id}>
                      <td className="text-mist">{u.email}</td>
                      <td className="text-mist">
                        {u.userName ?? u.name ?? "—"}
                      </td>
                      <td>
                        <span className={`badge ${ROLE_BADGE[u.role] ?? "badge-muted"}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td>
                        {u.isVerified ? (
                          <span className="badge badge-ice">
                            <span className="badge-dot bg-ice" />
                            Sim
                          </span>
                        ) : (
                          <span className="badge badge-muted">
                            <span className="badge-dot bg-mist" />
                            Não
                          </span>
                        )}
                      </td>
                      <td>
                        {isSuspended ? (
                          <span className="badge badge-signal">
                            <span className="badge-dot bg-signal" />
                            Suspenso
                          </span>
                        ) : (
                          <span className="badge badge-ice">
                            <span className="badge-dot bg-ice" />
                            Ativo
                          </span>
                        )}
                        {isSuspended && (
                          <span className="ml-2 block text-caption text-mist">
                            até {new Date(u.suspendedUntil!).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </td>
                      <td className="text-caption text-mist">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          <Link
                            href={`/admin/usuarios/${u.id}`}
                            className="btn-ghost btn-sm"
                          >
                            Ver
                          </Link>
                          <button
                            onClick={() => setRoleModal(u)}
                            disabled={isSelf}
                            className="btn-ghost btn-sm"
                            title={isSelf ? "Não pode alterar próprio cargo" : "Alterar cargo"}
                          >
                            Cargo
                          </button>
                          <button
                            onClick={() => setModerateModal(u)}
                            disabled={!canModify}
                            className="btn-ghost btn-sm"
                            title={!canModify ? "Sem permissão" : "Moderar usuário"}
                          >
                            Moderar
                          </button>
                          {confirmDelete === u.id ? (
                            <>
                              <button
                                onClick={() => deleteUser(u.id)}
                                disabled={actioning === u.id || !canDelete}
                                className="btn-danger btn-sm"
                              >
                                {actioning === u.id ? "..." : "Confirmar?"}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="btn-ghost btn-sm"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(u.id)}
                              disabled={!canDelete}
                              className="btn-ghost btn-sm text-signal"
                              title={
                                isSelf
                                  ? "Não pode excluir a si mesmo"
                                  : u.role === "SUPERADMIN"
                                    ? "Não é possível excluir SUPERADMIN"
                                    : "Excluir usuário"
                              }
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
        </>
      )}

      {roleModal && (
        <SharedModal
          open={!!roleModal}
          onClose={() => setRoleModal(null)}
          title="Alterar cargo"
        >
          <p className="text-body-sm text-mist">
            Usuário: <span className="text-ice">{roleModal.email}</span>
          </p>
          <p className="mt-1 text-body-sm text-mist">
            Cargo atual: <span className="text-snow">{ROLE_LABELS[roleModal.role]}</span>
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {(["USER", "ADMIN", "SUPERADMIN"] as const).map((r) => (
              <button
                key={r}
                onClick={() => changeRole(roleModal.id, r)}
                disabled={r === roleModal.role || actioning === roleModal.id}
                className={`border px-3 py-2 text-left text-body-sm transition-colors disabled:opacity-50 ${
                  r === roleModal.role
                    ? "border-ice bg-ice/5 text-ice"
                    : "border-hairline text-mist hover:border-ice/40 hover:text-ice"
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setRoleModal(null)} className="btn-ghost">
              Fechar
            </button>
          </div>
        </SharedModal>
      )}

      {moderateModal && (
        <ModerateUserModal
          target={moderateModal}
          onClose={() => setModerateModal(null)}
          onSuccess={() => loadUsers(page, search)}
        />
      )}
    </>
  );
}

function ModerateUserModal({
  target,
  onClose,
  onSuccess,
}: {
  target: AdminUserListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [action, setAction] = useState<ModerateAction>("WARN");
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isSuspended = target.suspendedUntil && new Date(target.suspendedUntil) > new Date();

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const body: { actionType: ModerateAction; reason?: string; hours?: number } = {
        actionType: action,
      };
      if (reason) body.reason = reason;
      if (hours) body.hours = parseInt(hours, 10);
      await api.adminModerateUser(target.id, body);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao aplicar ação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SharedModal open={!!target} onClose={onClose} title="Moderar usuário">
      <div className="space-y-3">
        <div>
          <p className="text-body-sm text-mist">
            Usuário: <span className="text-ice">{target.email}</span>
          </p>
          <p className="text-body-sm text-mist">
            Nome: <span className="text-snow">{target.userName ?? target.name ?? "—"}</span>
          </p>
          {isSuspended && (
            <p className="mt-2">
              <span className="badge badge-signal">
                <span className="badge-dot bg-signal" />
                Já suspenso até {new Date(target.suspendedUntil!).toLocaleString("pt-BR")}
              </span>
            </p>
          )}
        </div>

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
                <p className="mt-0.5 text-caption normal-case text-mist">
                  {ACTION_DESC[a]}
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
              placeholder="ex: 24, 168..."
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

        {error && (
          <div className="border border-signal/40 bg-signal/10 p-3 text-caption text-signal">
            {error}
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={handleSubmit}
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
