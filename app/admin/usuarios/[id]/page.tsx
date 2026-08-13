"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { isPrivileged } from "@/lib/role";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/common/Avatar";
import type { AdminUserDetail } from "@/lib/api";

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = useAuth();
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id || !isPrivileged(user)) return;
    setLoading(true);
    api
      .adminGetUser(id)
      .then((d) => setData(d))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Erro ao carregar usuário."),
      )
      .finally(() => setLoading(false));
  }, [user, id]);

  if (loading) {
    return <div className="admin-empty">Carregando usuário...</div>;
  }

  if (error) {
    return (
      <div className="mt-2 border border-signal/40 bg-signal/10 p-4 text-body-sm text-signal">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const isSuspended = data.suspendedUntil && new Date(data.suspendedUntil) > new Date();

  const stats = [
    { label: "Comentários", value: data._count.comments, color: "text-snow" },
    { label: "Avaliações", value: data._count.ratings, color: "text-snow" },
    { label: "Favoritos", value: data._count.favorites, color: "text-snow" },
    { label: "Histórico", value: data._count.watchHistories, color: "text-snow" },
    { label: "Denúncias feitas", value: data._count.reportsFiled, color: data._count.reportsFiled > 0 ? "text-signal" : "text-snow" },
  ];

  return (
    <>
      <div className="mb-2">
        <Link href="/admin/usuarios" className="text-body-sm text-mist transition-colors hover:text-ice">
          ← Voltar à lista de usuários
        </Link>
      </div>

      <div className="admin-card mt-4 p-6">
        <div className="flex flex-wrap items-start gap-6">
          <div className="shrink-0">
            <Avatar
              src={data.avatar ?? null}
              name={data.name}
              className="h-24 w-24"
              size={96}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-display-xl text-snow">
                {data.userName ?? data.name ?? "—"}
              </h1>
              <span
                className={`badge ${
                  data.role === "SUPERADMIN" ? "badge-ice" : data.role === "ADMIN" ? "badge-ice" : "badge-muted"
                }`}
              >
                {data.role}
              </span>
              {data.isVerified ? (
                <span className="badge badge-ice">
                  <span className="badge-dot bg-ice" />
                  Verificado
                </span>
              ) : (
                <span className="badge badge-muted">
                  <span className="badge-dot bg-mist" />
                  Não verificado
                </span>
              )}
              {isSuspended ? (
                <span className="badge badge-signal">
                  <span className="badge-dot bg-signal animate-blink" />
                  Suspenso
                </span>
              ) : (
                <span className="badge badge-ice">
                  <span className="badge-dot bg-ice" />
                  Ativo
                </span>
              )}
            </div>

            <p className="mt-2 text-body-sm text-mist">
              <span className="text-snow">{data.email}</span>
            </p>
            {data.name && data.userName && (
              <p className="mt-1 text-caption text-mist">
                Nome: <span className="text-snow">{data.name}</span>
              </p>
            )}

            {data.bio && (
              <div className="mt-3 border-l-2 border-ice/30 pl-3 text-body-sm text-mist">
                {data.bio}
              </div>
            )}

            {isSuspended && (
              <div className="mt-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
                <p>
                  Suspenso até{" "}
                  <span className="font-mono">
                    {new Date(data.suspendedUntil!).toLocaleString("pt-BR")}
                  </span>
                </p>
                {data.suspendedReason && (
                  <p className="mt-1">
                    Motivo: <span className="text-snow">{data.suspendedReason}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="shelf-label">Estatísticas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="admin-stat">
              <p className="font-mono text-caption uppercase tracking-wider text-mist">
                {s.label}
              </p>
              <p className={`mt-1 font-display text-display-lg tabular-nums ${s.color}`}>
                {s.value.toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="shelf-label">Metadados</h2>
        <dl className="admin-card divide-y divide-hairline">
          <MetadataRow label="ID" value={data.id} mono />
          <MetadataRow label="Email" value={data.email} />
          <MetadataRow label="Apelido" value={data.userName ?? "—"} />
          <MetadataRow label="Nome" value={data.name ?? "—"} />
          <MetadataRow label="Cargo" value={data.role} />
          <MetadataRow label="Verificado" value={data.isVerified ? "Sim" : "Não"} />
          <MetadataRow label="Criado em" value={new Date(data.createdAt).toLocaleString("pt-BR")} />
          <MetadataRow label="Atualizado em" value={new Date(data.updatedAt).toLocaleString("pt-BR")} />
        </dl>
      </section>
    </>
  );
}

function MetadataRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2.5">
      <dt className="w-32 shrink-0 font-mono text-caption uppercase tracking-wider text-mist">
        {label}
      </dt>
      <dd className={`flex-1 break-all text-body-sm ${mono ? "font-mono" : ""} text-snow`}>
        {value}
      </dd>
    </div>
  );
}

