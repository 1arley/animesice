import { NotificationCategoryIcon } from "@/components/common/NotificationCategoryIcon";
import {
  notificationCategoryMeta,
  NOTIFICATION_AUDIENCE_LABELS,
} from "@/lib/notification-categories";
import type {
  AdminNotificationAudience,
  AdminNotificationCategory,
} from "@/types";

export function NotificationPreview({
  category,
  title,
  body,
  linkUrl,
  audience,
  recipientCount,
}: {
  category: AdminNotificationCategory;
  title: string;
  body: string;
  linkUrl: string;
  audience: AdminNotificationAudience;
  recipientCount: number;
}) {
  const meta = notificationCategoryMeta(category);

  return (
    <div className="admin-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <span className="font-mono text-caption uppercase tracking-[0.18em] text-mist">
          Prévia
        </span>
        <span className="badge badge-muted">
          <span className="badge-dot bg-ice" />
          sino do jogador
        </span>
      </div>

      <div className="p-4">
        <div className="border border-hairline bg-ink p-3">
          <div className="flex items-center gap-2">
            {meta && (
              <span
                className={`inline-flex h-7 w-7 items-center justify-center border ${meta.chipClass}`}
              >
                <NotificationCategoryIcon
                  category={category}
                  className="h-4 w-4"
                />
              </span>
            )}
            {meta && (
              <span
                className={`inline-flex items-center border px-2 py-0.5 font-mono text-caption uppercase tracking-wider ${meta.chipClass}`}
              >
                {meta.label}
              </span>
            )}
          </div>

          <p className="mt-3 font-sans text-body-sm font-medium text-ice">
            {title.trim() || "Título da notificação"}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-caption text-mist">
            {body.trim() || "A mensagem aparecerá aqui, como o jogador vai ler."}
          </p>
          {linkUrl.trim() && (
            <p className="mt-2 font-mono text-caption text-ice/80 underline underline-offset-2">
              Abrir {linkUrl.trim()}
            </p>
          )}
          <p className="mt-2 font-mono text-caption text-mist-dim">agora</p>
        </div>

        <div className="mt-4 space-y-1 border-t border-hairline pt-3 text-caption text-mist">
          <p>
            <span className="font-mono uppercase tracking-wider text-mist-soft">
              Público:
            </span>{" "}
            {NOTIFICATION_AUDIENCE_LABELS[audience]}
            {audience !== "GLOBAL" && recipientCount > 0
              ? ` · ${recipientCount} selecionado${recipientCount === 1 ? "" : "s"}`
              : ""}
          </p>
          <p className="text-mist-soft">
            Comunicados da administração são sempre entregues no sino — as
            preferências pessoais cobrem apenas notificações de atividade.
          </p>
        </div>
      </div>
    </div>
  );
}
