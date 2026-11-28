"use client";

import { useState } from "react";
import { NotificationComposer } from "@/components/admin/notifications/NotificationComposer";
import { NotificationHistory } from "@/components/admin/notifications/NotificationHistory";

type Tab = "compose" | "history";

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState<Tab>("compose");
  const [historyVersion, setHistoryVersion] = useState(0);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-display-xl text-snow">Notificações</h1>
        <span className="badge badge-ice">
          <span className="badge-dot bg-ice" />
          canal oficial
        </span>
      </div>
      <p className="text-body-sm text-mist">
        Fale diretamente com os jogadores pelo sino do site — de um
        agradecimento individual a um comunicado para toda a comunidade.
      </p>

      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Seções da central de notificações"
      >
        <button
          type="button"
          onClick={() => setTab("compose")}
          aria-pressed={tab === "compose"}
          className={`admin-tab ${tab === "compose" ? "admin-tab-active" : ""}`}
        >
          Enviar comunicado
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          aria-pressed={tab === "history"}
          className={`admin-tab ${tab === "history" ? "admin-tab-active" : ""}`}
        >
          Histórico
        </button>
      </div>

      <div className="mt-4">
        {tab === "compose" ? (
          <NotificationComposer
            onSent={() => setHistoryVersion((current) => current + 1)}
            onViewHistory={() => setTab("history")}
          />
        ) : (
          <NotificationHistory refreshKey={historyVersion} />
        )}
      </div>
    </>
  );
}
