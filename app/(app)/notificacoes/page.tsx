"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/time";
import { NotificationCategoryIcon } from "@/components/common/NotificationCategoryIcon";
import { notificationCategoryMeta } from "@/lib/notification-categories";
import type { NotificationItem } from "@/types";

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.listNotifications().then((res) => {
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    }).catch(() => {});
  }, [user]);

  async function markRead(id: string) {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }

  if (loading) return <div className="mx-auto max-w-shelf px-4 py-8 text-mist">Carregando...</div>;
  if (!user) return <div className="mx-auto max-w-shelf px-4 py-8 text-mist"><Link href="/login" className="text-ice underline">Entre</Link> para ver notificações.</div>;

  return (
    <div className="mx-auto max-w-shelf px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="shelf-label">Notificações {unreadCount > 0 && <span className="shelf-label-data">{unreadCount} novas</span>}</h1>
        {unreadCount > 0 && <button onClick={markAllRead} className="btn-ghost">Marcar todas como lidas</button>}
      </div>
      {notifications.length === 0 ? <p className="text-body-sm text-mist">Sem notificações.</p> : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const categoryMeta = notificationCategoryMeta(n.adminCategory);
            return (
            <a key={n.id} href={n.type === "NEW_FOLLOW" && n.actorId ? `/users/${n.actorId}` : (n.linkUrl ?? "#")} onClick={() => !n.read && markRead(n.id)} className={`block border border-hairline p-4 hover:border-ice ${n.read ? "bg-panel" : "border-ice/50 bg-ice/5"}`}>
              {categoryMeta && n.adminCategory && (
                <span className={`mb-2 inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-caption uppercase tracking-wider ${categoryMeta.chipClass}`}>
                  <NotificationCategoryIcon category={n.adminCategory} className="h-3.5 w-3.5" />
                  {categoryMeta.label}
                </span>
              )}
              <p className="font-sans text-body font-medium text-ice">{n.title}</p>
              {n.body && <p className="mt-1 text-body-sm text-mist">{n.body}</p>}
              <p className="mt-2 font-mono text-caption text-mist">{formatDateTime(n.createdAt)}</p>
            </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
