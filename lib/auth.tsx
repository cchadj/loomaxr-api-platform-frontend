"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User, AuthTokens, DevModeInfo } from "@/types/api";
import { apiGet, apiPost } from "@/lib/api";
import {
  clearAccessTokenCookie,
  clearDevAuthCookies,
  syncAccessTokenCookie,
  syncDevAuthCookies,
} from "@/lib/client-auth-cookies";

interface AuthContextValue {
  user: User | null;
  devMode: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await apiPost("/api/auth/logout", { refresh_token: refreshToken }).catch(() => {});
      }
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("dev_mode");
      localStorage.removeItem("dev_user_id");
      localStorage.removeItem("dev_roles");
      clearAccessTokenCookie();
      clearDevAuthCookies();
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const handleAuthLogout = () => void logout();
    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, [logout]);

  useEffect(() => {
    async function init() {
      try {
        const dev = await apiGet<DevModeInfo>("/api/auth/dev");
        if (dev.auth_dev_mode) {
          setDevMode(true);
          // default_roles is string[] from backend, but guard against old plain-string responses
          const roles: string[] = Array.isArray(dev.default_roles)
            ? dev.default_roles
            : String(dev.default_roles ?? "admin").split(",").map((r) => r.trim()).filter(Boolean);
          localStorage.setItem("dev_mode", "true");
          localStorage.setItem("dev_user_id", dev.default_user_id);
          localStorage.setItem("dev_roles", roles.join(","));
          clearAccessTokenCookie();
          syncDevAuthCookies(dev.default_user_id, roles.join(","));
          // Synthesize user from dev defaults
          setUser({
            id: dev.default_user_id,
            username: "dev",
            roles,
          });
        } else {
          setDevMode(false);
          localStorage.removeItem("dev_mode");
          localStorage.removeItem("dev_user_id");
          localStorage.removeItem("dev_roles");
          clearDevAuthCookies();
          const token = localStorage.getItem("access_token");
          if (token) {
            syncAccessTokenCookie(token);
            try {
              const me = await apiGet<User>("/api/auth/me");
              setUser(me);
            } catch {
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              clearAccessTokenCookie();
            }
          } else {
            clearAccessTokenCookie();
          }
        }
      } catch {
        // API unreachable — allow app to load
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiPost<AuthTokens>("/api/auth/login", { username, password });

    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    localStorage.removeItem("dev_mode");
    localStorage.removeItem("dev_user_id");
    localStorage.removeItem("dev_roles");
    clearDevAuthCookies();
    syncAccessTokenCookie(data.access_token, data.expires_in_seconds);
    setDevMode(false);
    setUser(data.user);
  }, []);

  const hasRole = useCallback(
    (role: string) => {
      if (!user) return false;
      const lower = role.toLowerCase();
      return user.roles.includes(lower) || user.roles.includes("admin");
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, devMode, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
