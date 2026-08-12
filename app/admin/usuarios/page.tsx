"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [meta, setMeta] = useState<Paginated<AdminUserListItem>["meta"] | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<AdminUserListItem | null>(null);

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
    setDeleting(id);
    setError(null);
    try {
      await api.adminDeleteUser(id);
      setConfirmDelete(null);
      loadUsers(page, search);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao excluir usuário.");
    } finally {
      setDeleting(null);
    }
  }

  async function changeRole(id: string, role: "USER" | "ADMIN" | "SUPERADMIN") {
    try {
      await api.adminUpdateUserRole(id, role);
      setRoleModal(null);
      loadUsers(page, search);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao alterar cargo.");
    }
  }

  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  return (
    <>
      <h1 className="font-display text-display-xl text-snow">Gerenciar Usuários</h1>
      <p className="mt-1 text-body-sm text-mist">
        Listar, buscar, alterar cargo e excluir usuários do site.
      </p>

      {error && (
        <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <h2 className="shelf-label">
          Usuários <span className="shelf-label-data">{total}</span>
        </h2>
        <input
          type="search"
          placeholder="Buscar por email, nome ou apelido…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="ml-auto w-full max-w-xs border border-hairline bg-panel px-3 py-1.5 text-body-sm text-snow placeholder:text-mist focus:border-ice focus:outline-none"
        />
      </div>

      {loading ? (
        <p className="mt-4 text-body-sm text-mist">Carregando...</p>
      ) : users.length === 0 ? (
        <p className="mt-4 text-body-sm text-mist">
          {search ? `Nenhum usuário encontrado para "${search}".` : "Nenhum usuário."}
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline text-caption uppercase tracking-wider text-mist">
                  <th className="py-2 pr-4 font-semibold">Email</th>
                  <th className="py-2 pr-4 font-semibold">Nome</th>
                  <th className="py-2 pr-4 font-semibold">Cargo</th>
                  <th className="py-2 pr-4 font-semibold">Verificado</th>
                  <th className="py-2 pr-4 font-semibold">Suspenso</th>
                  <th className="py-2 pr-4 font-semibold">Criado</th>
                  <th className="py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="font-sans text-body-sm">
                {users.map((u) => {
                  const isSuspended = u.suspendedUntil && new Date(u.suspendedUntil) > new Date();
                  const isSelf = u.id === user?.id;
                  return (
                    <tr key={u.id} className="border-b border-hairline/60 align-middle">
                      <td className="py-2 pr-4 text-mist">{u.email}</td>
                      <td className="py-2 pr-4 text-mist">
                        {u.userName ?? u.name ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`font-mono text-caption uppercase ${
                          u.role === "SUPERADMIN" ? "text-ice" : u.role === "ADMIN" ? "text-ice/70" : "text-mist"
                        }`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {u.isVerified ? (
                          <span className="text-caption text-ice">sim</span>
                        ) : (
                          <span className="text-caption text-signal">não</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {isSuspended ? (
                          <span className="text-caption text-signal">
                            até {new Date(u.suspendedUntil!).toLocaleDateString("pt-BR")}
                          </span>
                        ) : (
                          <span className="text-caption text-mist">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-caption text-mist">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setRoleModal(u)}
                            disabled={isSelf}
                            className="text-caption text-ice transition-colors hover:opacity-70 disabled:opacity-30"
                            title={isSelf ? "Não pode alterar próprio cargo" : "Alterar cargo"}
                          >
                            cargo
                          </button>
                          {confirmDelete === u.id ? (
                            <>
                              <button
                                onClick={() => deleteUser(u.id)}
                                disabled={deleting === u.id || isSelf || u.role === "SUPERADMIN"}
                                className="text-caption text-signal transition-colors hover:opacity-70 disabled:opacity-30"
                              >
                                {deleting === u.id ? "..." : "confirmar?"}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-caption text-mist transition-colors hover:opacity-70"
                              >
                                cancelar
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(u.id)}
                              disabled={isSelf || u.role === "SUPERADMIN"}
                              className="text-caption text-signal transition-colors hover:opacity-70 disabled:opacity-30"
                              title={isSelf ? "Não pode excluir a si mesmo" : u.role === "SUPERADMIN" ? "Não é possível excluir SUPERADMIN" : "Excluir usuário"}
                            >
                              excluir
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
            Cargo atual: {ROLE_LABELS[roleModal.role]}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {(["USER", "ADMIN", "SUPERADMIN"] as const).map((r) => (
              <button
                key={r}
                onClick={() => changeRole(roleModal.id, r)}
                disabled={r === roleModal.role}
                className={`border px-3 py-2 text-left text-body-sm transition-colors ${
                  r === roleModal.role
                    ? "border-ice text-ice"
                    : "border-hairline text-mist hover:border-ice/40 hover:text-ice"
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setRoleModal(null)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </SharedModal>
      )}
    </>
  );
}