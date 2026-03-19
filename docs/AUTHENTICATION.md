# Authentication — Frontend

## Overview

The frontend uses a **dual-storage design**: auth state lives in `localStorage` for JavaScript access, and is mirrored to cookies so that Next.js server-side route handlers can read it without the JS bundle.

Two modes are supported, detected automatically on startup:

- **JWT mode** — user logs in with username/password; receives an access token and a refresh token.
- **Dev mode** — backend is running with `AUTH_DEV_MODE=true`; no login required; identity is derived from backend defaults.

---

## `AuthProvider` (`lib/auth.tsx`)

Wrap the app with `<AuthProvider>` (done in the root layout). Provides `useAuth()` to any client component.

```tsx
const { user, devMode, loading, login, logout, hasRole } = useAuth();
```

| Value | Type | Description |
|---|---|---|
| `user` | `User \| null` | Current user object, or `null` if unauthenticated |
| `devMode` | `boolean` | Whether backend dev mode is active |
| `loading` | `boolean` | `true` until the init check completes |
| `login(username, password)` | `async fn` | Submit credentials, store tokens, set user |
| `logout()` | `async fn` | Revoke refresh token, clear storage + cookies, redirect to `/login` |
| `hasRole(role)` | `fn → boolean` | Check if the current user has a given role (or is admin) |

### Initialization flow

On mount, `AuthProvider` calls `GET /api/auth/dev`:

1. **Dev mode on** — store dev identity in `localStorage` (`dev_mode`, `dev_user_id`, `dev_roles`), sync to cookies via `syncDevAuthCookies()`, synthesize a `User` object from the backend defaults. No JWT is involved.
2. **Dev mode off** — clear dev keys from storage/cookies. If an `access_token` exists in `localStorage`, sync it to the access token cookie and call `GET /api/auth/me` to restore the session. If `/me` fails, clear stored tokens.
3. **API unreachable** — log nothing, set `loading = false`, let the app render (unauthenticated).

### `login()`

Calls `POST /api/auth/login`, stores `access_token` and `refresh_token` in `localStorage`, syncs the access token cookie via `syncAccessTokenCookie()`, and updates `user` state. Clears any lingering dev-mode keys.

### `logout()`

Calls `POST /api/auth/logout` with the stored refresh token (best-effort, error ignored), then clears all auth keys from `localStorage` and all auth cookies, resets `user` to `null`, and navigates to `/login`.

Logout is also triggered by the `auth:logout` custom DOM event (dispatched by `apiFetch` when a 401 cannot be recovered).

### `hasRole(role)`

Returns `true` if `user.roles` contains the given role string (case-insensitive lowercase) **or** if the user has the `admin` role.

---

## `apiFetch` (`lib/api.ts`)

All API calls go through `apiFetch(path, options)`. It handles auth header injection, automatic token refresh, and logout-on-failure.

### Auth header injection (`getAuthHeaders`)

Called before every request:

- **Dev mode** (`localStorage.dev_mode === "true"`) → sets `X-User-Id` and `X-User-Roles` headers.
- **JWT mode** → sets `Authorization: Bearer <access_token>` if an access token exists.
- **Server-side** (no `window`) → returns `{}` (no headers injected).

### Automatic token refresh

If a response returns `401`:

1. A single `refreshTokens()` call is started. If one is already in flight, the pending promise is reused — this deduplicates concurrent 401s from parallel requests.
2. `refreshTokens()` calls `POST /api/auth/refresh` with the stored refresh token, updates `localStorage` with the new token pair, and syncs the access token cookie.
3. The original request is retried with the new token.
4. If the retry also returns `401`, or if `refreshTokens()` fails, `apiFetch` dispatches `auth:logout` on `window` (caught by `AuthProvider`) and throws `AuthError`.

### `AuthError`

Thrown when the user is definitively unauthenticated (no valid token and refresh failed). Components can catch this to show an error or redirect.

### Convenience wrappers

`apiGet`, `apiPost`, `apiPatch`, `apiPut`, `apiDelete`, `apiPostFormData` — all call `apiFetch` and parse the response via `parseResponse`. Non-2xx responses throw `ApiRequestError` with `status` and `data` fields.

---

## Cookie sync (`lib/client-auth-cookies.ts`)

Cookies exist solely so that server-side Next.js route handlers can read auth state. The JS app always reads from `localStorage`; cookies are write-only from the client's perspective.

| Cookie | Set by | Cleared by | Purpose |
|---|---|---|---|
| `frontend_access_token` | `syncAccessTokenCookie(token, expiresInSeconds?)` | `clearAccessTokenCookie()` | JWT for SSR route handlers |
| `frontend_dev_mode` | `syncDevAuthCookies(userId, roles)` | `clearDevAuthCookies()` | Signals dev mode to SSR |
| `frontend_dev_user_id` | `syncDevAuthCookies(userId, roles)` | `clearDevAuthCookies()` | Dev user ID for SSR |
| `frontend_dev_roles` | `syncDevAuthCookies(userId, roles)` | `clearDevAuthCookies()` | Dev roles CSV for SSR |

All cookies use `Path=/; SameSite=Lax` and add `Secure` automatically on HTTPS. The access token cookie gets a `Max-Age` matching the token's `expires_in_seconds` so it auto-expires in the browser.

### When cookies are set/cleared

- **Login** → `syncAccessTokenCookie` (JWT mode).
- **Dev mode detected on init** → `syncDevAuthCookies`; access token cookie is cleared.
- **JWT mode detected on init** → `syncAccessTokenCookie` if a token exists; dev cookies are cleared.
- **Logout** → both `clearAccessTokenCookie` and `clearDevAuthCookies`.
- **401 refresh failure** → `clearAccessTokenCookie`.

---

## Dev mode in the frontend

Dev mode is detected by polling `GET /api/auth/dev` on `AuthProvider` init. When active:

- `localStorage` holds `dev_mode=true`, `dev_user_id`, `dev_roles`.
- API calls send `X-User-Id` / `X-User-Roles` headers instead of a JWT.
- The login page shows a dev-mode banner and skips the login form (or auto-redirects if a user is already set).
- No access token cookie is set; instead, dev cookies are synced for SSR.

To disable dev mode, set `AUTH_DEV_MODE=false` in the backend `.env` and restart the backend. The frontend will detect the change on next page load.

---

## Server-side proxy route (`app/proxy/assets/[assetId]/download/route.ts`)

Asset downloads require auth headers, but browser `<a href>` or `<video src>` tags cannot set headers. The proxy route is a Next.js Route Handler that runs server-side, reads the auth cookies, adds the appropriate header to a backend request, and streams the response back to the browser.

**Flow:**

1. Browser requests `GET /proxy/assets/<id>/download`.
2. Route handler reads `frontend_access_token` cookie → sets `Authorization: Bearer <token>`.
3. Or reads `frontend_dev_mode` + `frontend_dev_user_id` + `frontend_dev_roles` → sets `X-User-Id` / `X-User-Roles`.
4. If neither is present → returns `401`.
5. Forwards the request to `NEXT_PUBLIC_API_URL/api/assets/<id>/download` and streams the response, preserving `Content-Type`, `Content-Disposition`, and `Content-Length`.

**Why `/proxy/` and not `/api/`?**

`next.config.ts` defines a rewrite rule: `source: "/api/:path*"` → `destination: "http://localhost:8000/api/:path*"`. Next.js rewrites are evaluated before Route Handlers. A route handler at `app/api/assets/[assetId]/download/route.ts` would be shadowed by this rewrite and never execute. Placing the handler under `/proxy/` sidesteps the conflict entirely.

---

## Login page behaviour

- On load, the login page calls `useAuth()` to get the current user.
- If a user is already set (session restored from `localStorage` or dev mode active), the page immediately redirects to `/` (or the original target URL if a `?redirect=` query param is present).
- In dev mode, a banner explains that authentication is bypassed.
- Successful login calls `AuthProvider.login()`, which updates state and redirects to the dashboard.
