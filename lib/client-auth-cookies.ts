"use client";

const ACCESS_TOKEN_COOKIE = "frontend_access_token";
const DEV_MODE_COOKIE = "frontend_dev_mode";
const DEV_USER_ID_COOKIE = "frontend_dev_user_id";
const DEV_ROLES_COOKIE = "frontend_dev_roles";

function cookieOptions(maxAge?: number): string {
  const parts = ["Path=/", "SameSite=Lax"];
  if (typeof maxAge === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  }
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function setCookie(name: string, value: string, maxAge?: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${cookieOptions(maxAge)}`;
}

function clearCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; ${cookieOptions(0)}`;
}

export function syncAccessTokenCookie(token: string, expiresInSeconds?: number): void {
  setCookie(ACCESS_TOKEN_COOKIE, token, expiresInSeconds);
}

export function clearAccessTokenCookie(): void {
  clearCookie(ACCESS_TOKEN_COOKIE);
}

export function syncDevAuthCookies(userId: string, roles: string): void {
  setCookie(DEV_MODE_COOKIE, "true");
  setCookie(DEV_USER_ID_COOKIE, userId);
  setCookie(DEV_ROLES_COOKIE, roles);
}

export function clearDevAuthCookies(): void {
  clearCookie(DEV_MODE_COOKIE);
  clearCookie(DEV_USER_ID_COOKIE);
  clearCookie(DEV_ROLES_COOKIE);
}
