"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/time";
import { Avatar } from "@/components/common/Avatar";
import { Modal } from "@/components/common/Modal";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { SearchField } from "@/components/ui/SearchField";
import { NotificationCategoryIcon } from "@/components/common/NotificationCategoryIcon";
import {
  notificationCategoryMeta,
  NOTIFICATION_AUDIENCE_LABELS,
  NOTIFICATION_CATEGORIES,
} from "@/lib/notification-categories";
import type {
  AdminNotificationCampaign,
  AdminNotificationCategory,
  AdminNotificationDetail,
} from "@/types";

const PAGE_SIZE = 20;
const DETAIL_PAGE_SIZE = 20;

type CategoryFilter = "ALL" | AdminNotificationCategory;

export function NotificationHistory({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<AdminNotificationCampaign[]>([]);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminNotificationDetail | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .adminListNotificationHistory(page, PAGE_SIZE, {
        category: category === "ALL" ? undefined : category,
        search: debouncedSearch || undefined,
      })
      .then((response) => {
        if (cancelled) return;
        setItems(response.data);
        setMeta(response.meta);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Erro ao carregar o histórico.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, category, debouncedSearch, refreshKey]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    api
      .adminGetNotificationCampaign(detailId, detailPage, DETAIL_PAGE_SIZE)
      .then((response) => {
        if (!cancelled) setDetail(response);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setDetailError(
            requestError instanceof ApiError
              ? requestError.message
              : "Erro ao carregar os destinatários.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailId, detailPage]);

  function openDetail(campaign: AdminNotificationCampaign) {
    setDetailId(campaign.id);
    setDetailPage(1);
  }

  function closeDetail() {
    setDetailId(null);
    setDetail(null);
    setDetailPage(1);
    setDetailError(null);
  }

  const total = meta?.total ?? 0;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="history-search"
              className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist"
            >
              Buscar no histórico
            </label>
            <SearchField
              id="history-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Título ou mensagem"
              autoComplete="off"
            />
          </div>
          <div className="sm:w-64">
            <label
              htmlFor="history-category"
              className="mb-1.5 block font-mono text-caption uppercase tracking-wider text-mist"
            >
              Categoria
            </label>
            <select
              id="history-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as CategoryFilter);
                setPage(1);
              }}
              className="field min-h-11 w-full"
            >
              <option value="ALL">Todas as categorias</option>
              {NOTIFICATION_CATEGORIES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <span className="badge badge-muted h-fit sm:mb-2">
            <span className="badge-dot bg-ice" />
            {total} envio{total === 1 ? "" : "s"}
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal"
          >
            {error}
          </p>
        )}

        {loading ? (
          <div className="admin-empty">Carregando histórico...</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">
            Nenhum comunicado enviado com esses filtros.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((campaign) => {
              const categoryMeta = notificationCategoryMeta(campaign.category);
              return (
                <li key={campaign.id}>
                  <button
                    type="button"
                    onClick={() => openDetail(campaign)}
                    className="admin-card w-full p-4 text-left"
                    aria-label={`Ver detalhes do comunicado ${campaign.title}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {categoryMeta && (
                        <span
                          className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-caption uppercase tracking-wider ${categoryMeta.chipClass}`}
                        >
                          <NotificationCategoryIcon
                            category={campaign.category}
                            className="h-3.5 w-3.5"
                          />
                          {categoryMeta.label}
                        </span>
                      )}
                      <span className="badge badge-muted">
                        {NOTIFICATION_AUDIENCE_LABELS[campaign.audience]}
                      </span>
                      <span className="font-mono text-caption text-mist">
                        {formatDateTime(campaign.createdAt)}
                      </span>
                    </div>

                    <p className="mt-2 text-body-md font-medium text-snow">
                      {campaign.title}
                    </p>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-body-sm text-mist">
                      {campaign.body}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2 font-mono text-caption text-mist">
                      <span>
                        {campaign.recipientCount} destinatário
                        {campaign.recipientCount === 1 ? "" : "s"}
                      </span>
                      <span>
                        por{" "}
                        {campaign.admin.name?.trim() ||
                          campaign.admin.userName ||
                          campaign.admin.id.slice(0, 8)}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <PaginationControls
          page={page}
          totalPages={meta?.totalPages ?? 1}
          onPageChange={setPage}
          label="Paginação do histórico de comunicados"
          busy={loading}
        />
      </div>

      <Modal
        open={Boolean(detailId)}
        onClose={closeDetail}
        title="Detalhes do comunicado"
        size="wide"
      >
        {detailLoading && !detail ? (
          <p className="text-body-sm text-mist">Carregando...</p>
        ) : detailError && !detail ? (
          <p role="alert" className="text-body-sm text-signal">
            {detailError}
          </p>
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {notificationCategoryMeta(detail.category) && (
                <span
                  className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-caption uppercase tracking-wider ${notificationCategoryMeta(detail.category)?.chipClass}`}
                >
                  <NotificationCategoryIcon
                    category={detail.category}
                    className="h-3.5 w-3.5"
                  />
                  {notificationCategoryMeta(detail.category)?.label}
                </span>
              )}
              <span className="badge badge-muted">
                {NOTIFICATION_AUDIENCE_LABELS[detail.audience]}
              </span>
              <span className="font-mono text-caption text-mist">
                {formatDateTime(detail.createdAt)}
              </span>
            </div>

            <div className="border border-hairline bg-ink p-3">
              <p className="text-body-md font-medium text-snow">
                {detail.title}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-body-sm text-mist">
                {detail.body}
              </p>
              {detail.linkUrl && (
                <p className="mt-2 font-mono text-caption text-ice">
                  Link: {detail.linkUrl}
                </p>
              )}
            </div>

            <dl className="grid gap-2 text-body-sm sm:grid-cols-3">
              <div>
                <dt className="font-mono text-caption uppercase tracking-wider text-mist">
                  Destinatários
                </dt>
                <dd className="text-snow">{detail.recipientCount}</dd>
              </div>
              <div>
                <dt className="font-mono text-caption uppercase tracking-wider text-mist">
                  Enviado por
                </dt>
                <dd className="text-snow">
                  {detail.admin.name?.trim() ||
                    detail.admin.userName ||
                    detail.admin.id.slice(0, 8)}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-caption uppercase tracking-wider text-mist">
                  Público
                </dt>
                <dd className="text-snow">
                  {NOTIFICATION_AUDIENCE_LABELS[detail.audience]}
                </dd>
              </div>
            </dl>

            <div>
              <h4 className="font-mono text-caption uppercase tracking-wider text-mist">
                Quem recebeu
              </h4>
              {detailError && (
                <p role="alert" className="mt-1 text-caption text-signal">
                  {detailError}
                </p>
              )}
              {detail.recipients.data.length === 0 ? (
                <p className="mt-2 text-body-sm text-mist">
                  Nenhum destinatário registrado.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-hairline border border-hairline">
                  {detail.recipients.data.map((recipient) => (
                    <li
                      key={recipient.id}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <Avatar
                        name={
                          recipient.user.name?.trim() ||
                          recipient.user.userName ||
                          "?"
                        }
                        src={recipient.user.avatar}
                        size={28}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm text-snow">
                          {recipient.user.name?.trim() ||
                            recipient.user.userName ||
                            "Jogador sem nome"}
                        </span>
                        <span className="block truncate font-mono text-caption text-mist">
                          {recipient.user.userName
                            ? `@${recipient.user.userName}`
                            : recipient.user.id.slice(0, 8)}
                        </span>
                      </span>
                      <span
                        className={`badge ${
                          recipient.read ? "badge-muted" : "badge-ice"
                        }`}
                      >
                        {recipient.read ? "Lida" : "Não lida"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <PaginationControls
                page={detailPage}
                totalPages={detail.recipients.meta.totalPages}
                onPageChange={setDetailPage}
                label="Paginação de destinatários do comunicado"
                busy={detailLoading}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
