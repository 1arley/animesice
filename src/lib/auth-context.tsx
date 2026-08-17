"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User, RegisterResponse } from "@/lib/api";

const loadApi = () => import("@/lib/api").then((module) => module.api);

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (name: string, email: string, password: string, turnstileToken?: string, userName?: string) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  logoutError: string | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    // Evita requisição desnecessária /user/me que retorna 401 e gera erro no console.
    // O backend envia um cookie `role` (não-httpOnly) quando há sessão ativa.
    const hasRoleCookie = typeof document !== "undefined" && document.cookie.includes("role=");
    if (!hasRoleCookie) {
      setUser(null);
      setLoading(false);
      return;
    }

    const start = () => loadApi().then((api) => api.me())
      .then(setUser)
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId: number = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(start, { timeout: 1500 })
      : Number(globalThis.setTimeout(start, 1));
    return () => {
      if (idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(idleId);
      else globalThis.clearTimeout(idleId);
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, turnstileToken?: string) => {
      const api = await loadApi();
      const res = await api.login({ email, password, turnstileToken });
      setUser(res.user);
    },
    [],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, turnstileToken?: string, userName?: string) => {
      const api = await loadApi();
      return await api.register({ name, email, password, turnstileToken, ...(userName ? { userName } : {}) });
    },
    [],
  );

  const logout = useCallback(async () => {
    setLogoutError(null);
    try {
      const api = await loadApi();
      await api.logout();
    } catch {
      setLogoutError("Não foi possível encerrar a sessão no servidor.");
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const api = await loadApi();
    const u = await api.me();
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, logoutError, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
