"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, type User, type RegisterResponse } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (name: string, email: string, password: string, turnstileToken?: string) => Promise<RegisterResponse>;
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
    api
      .me()
      .then(setUser)
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string, turnstileToken?: string) => {
      const res = await api.login({ email, password, turnstileToken });
      setUser(res.user);
    },
    [],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, turnstileToken?: string) => {
      return await api.register({ name, email, password, turnstileToken });
    },
    [],
  );

  const logout = useCallback(async () => {
    setLogoutError(null);
    try {
      await api.logout();
    } catch {
      setLogoutError("Não foi possível encerrar a sessão no servidor.");
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
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
