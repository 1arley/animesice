"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { NotificationItem } from "@/types";

const loadApi = () => import("@/lib/api").then((module) => module.api);

const POLL_INTERVAL = 30000;

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  const fetchNotifications = useCallback((signal?: AbortSignal) => {
    loadApi().then((api) => api.listNotifications(1, 5, false, signal))
      .then((data) => {
        setNotifications(data.data ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // silent
      });
  }, []);

  useEffect(() => {
    if (!user) return;

    const ac = new AbortController();
    fetchNotifications(ac.signal);

    const interval = setInterval(() => {
      fetchNotifications(ac.signal);
    }, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
      ac.abort();
    };
  }, [user, fetchNotifications]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
      const api = await loadApi();
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
        className="relative flex h-11 w-11 items-center justify-center text-mist transition-colors hover:text-ice"
        aria-label="Notificações"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M4 15h12M5.5 15V9a4.5 4.5 0 1 1 9 0v6M8.5 17.5a1.5 1.5 0 0 0 3 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center bg-ice px-1 font-mono text-label font-bold text-ink tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] border border-hairline bg-ink shadow-lg">
          <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
            <span className="font-display text-body-sm font-semibold text-ice">
              Notificações
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="font-mono text-caption text-mist hover:text-ice"
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
                <Link
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
                  <p className="mt-0.5 font-mono text-caption text-mist">
                    {new Date(n.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/notificacoes"
            className="block border-t border-hairline px-3 py-2 text-center font-mono text-caption text-mist hover:text-ice"
          >
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
