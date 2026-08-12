"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { NotificationPreference, NotificationType, NotificationChannel } from "@/types";

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  NEW_EPISODE: "Novos episódios",
  COMMENT_REPLY: "Respostas a comentários",
  COMMENT_LIKE: "Curtidas em comentários",
  MODERATION_ACTION: "Ações de moderação",
  SYSTEM: "Mensagens do sistema",
  POST_LIKE: "Curtidas em posts",
  POST_COMMENT: "Comentários em posts",
  NEW_FOLLOW: "Novos seguidores",
};

const ALL_TYPES: NotificationType[] = [
  "NEW_EPISODE",
  "COMMENT_REPLY",
  "COMMENT_LIKE",
  "MODERATION_ACTION",
  "SYSTEM",
  "POST_LIKE",
  "POST_COMMENT",
  "NEW_FOLLOW",
];

const channels: { key: NotificationChannel; label: string }[] = [
  { key: "IN_APP", label: "No site" },
  { key: "EMAIL", label: "E-mail" },
];

export function NotificationPreferencesSection() {
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.getNotificationPreferences()
      .then((data) => setPrefs(Array.isArray(data) ? data : []))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, []);

  function getPref(typeId: NotificationType, channel: NotificationChannel): boolean {
    const p = prefs.find((p) => p.typeId === typeId && p.channel === channel);
    return p ? p.enabled : true;
  }

  async function toggle(typeId: NotificationType, channel: NotificationChannel, enabled: boolean) {
    setSaving(true);
    setMsg("");
    setError(null);
    try {
      const updated = await api.updateNotificationPreference({ typeId, channel, enabled: !enabled });
      setPrefs((prev) => {
        const idx = prev.findIndex((p) => p.typeId === typeId && p.channel === channel);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erro ao atualizar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-body-sm text-mist">Carregando preferências...</p>;

  return (
    <section className="border border-hairline bg-panel p-6 md:col-span-2">
      <div className="mb-4">
        <h2 className="font-display text-display-lg text-snow">Notificações</h2>
        <p className="text-body-sm text-mist">
          Escolha o que você quer receber e por onde.
        </p>
      </div>

      {error && (
        <div className="mb-4 border border-signal/40 bg-signal/10 p-3 text-body-sm text-signal">
          {error}
        </div>
      )}
      {msg && (
        <div className="mb-4 border border-ice/40 bg-ice/10 p-3 text-body-sm text-ice">
          {msg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-hairline text-caption uppercase tracking-wider text-mist">
              <th className="py-2 pr-4 font-semibold">Tipo</th>
              {channels.map((c) => (
                <th key={c.key} className="py-2 px-3 text-center font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-sans text-body-sm">
            {ALL_TYPES.map((typeId) => (
              <tr key={typeId} className="border-b border-hairline/60">
                <td className="py-3 pr-4 text-ice">{NOTIFICATION_LABELS[typeId]}</td>
                {channels.map((c) => {
                  const enabled = getPref(typeId, c.key);
                  return (
                    <td key={c.key} className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggle(typeId, c.key, enabled)}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                          enabled
                            ? "border-ice bg-ice/20"
                            : "border-hairline bg-panel"
                        }`}
                        aria-label={`${enabled ? "Desligar" : "Ligar"} ${NOTIFICATION_LABELS[typeId]} (${c.label})`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                            enabled ? "translate-x-6" : "translate-x-1"
                          } ${enabled ? "" : "bg-mist"}`}
                          style={enabled ? { backgroundColor: "oklch(0.86 0.12 194)" } : {}}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
