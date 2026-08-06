"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, API_URL } from "@/lib/api";
import type { NotificationItem } from "@/types";

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`${API_URL}/notification?limit=5`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.data ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      fetch(`${API_URL}/notification?limit=5`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          setNotifications(data.data ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        })
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silent
    }
  }

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative font-display text-body text-mist transition-colors hover:text-ice"
        aria-label="Notificações"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-ice px-1 font-display text-[0.6rem] font-bold text-ink">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 border border-hairline bg-ink shadow-lg">
          <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
            <span className="font-display text-body-sm font-semibold text-ice">
              Notificações
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="font-display text-caption text-mist hover:text-ice"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-body-sm text-mist">Sem notificações.</p>
            ) : (
              notifications.map((n) => (
                <a
                  key={n.id}
                  href={n.linkUrl ?? "#"}
                  className={`block border-b border-hairline px-3 py-2 transition-colors hover:bg-hairline/50 ${
                    !n.read ? "bg-ice/5" : ""
                  }`}
                >
                  <p className="font-sans text-body-sm font-medium text-ice">
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-caption text-mist">{n.body}</p>
                  )}
                  <p className="mt-0.5 font-display text-caption text-mist">
                    {new Date(n.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </a>
              ))
            )}
          </div>
          <a
            href="/notificacoes"
            className="block border-t border-hairline px-3 py-2 text-center font-display text-caption text-mist hover:text-ice"
          >
            Ver todas
          </a>
        </div>
      )}
    </div>
  );
}
