# Auth Backend Contract

This document describes the contract the backend (`animesice-back`) must fulfill
for the frontend (`animesice-web`) to work correctly.

## Cookies

All auth state lives in httpOnly cookies set by the backend. The frontend never
touches tokens directly.

### Cookies the backend must set

| Cookie           | httpOnly | Purpose                              | Set by              |
| ---------------- | -------- | ------------------------------------ | ------------------- |
| `access_token`   | yes      | JWT access token (Bearer in requests) | `/auth/login`, `/auth/refresh` |
| `refresh_token`  | yes      | JWT refresh token                      | `/auth/login`, `/auth/refresh` |
| `role`           | **no**   | User role (`USER` / `ADMIN` / `SUPERADMIN`) — read by Next.js middleware | `/auth/login`, `/auth/refresh` |

### Cookie attributes

```
access_token:  HttpOnly; Secure; SameSite=Lax; Path=/
refresh_token: HttpOnly; Secure; SameSite=Lax; Path=/
role:          SameSite=Lax; Path=/   (NOT httpOnly — middleware must read it)
```

> `Secure` is toggled by `JWT_COOKIE_SECURE` env. In dev (`false`) cookies are
> sent over HTTP. In production they require HTTPS.

### Cookies the backend must clear on logout

`/auth/logout` must clear all three cookies:

```
clearCookie('access_token')
clearCookie('refresh_token')
clearCookie('role')
```

### Why `role` is non-httpOnly

Next.js middleware runs on the server edge and can only read cookies from the
request header. It cannot decode a JWT. So the backend sets a separate
`role` cookie (non-httpOnly, no sensitive data) that middleware reads to gate
`/admin/**` routes. The backend remains the source of truth — if the `role`
cookie is tampered with, backend guards (`RolesGuard`) still enforce
authorization on every API call.

## Endpoints

### `POST /auth/login`

**Request body**

```json
{ "email": "string", "password": "string" }
```

**Response 200**

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "USER | ADMIN | SUPERADMIN",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
}
```

**Side effects:** Sets `access_token`, `refresh_token`, `role` cookies.

> The response body must **not** contain `access_token` or `refresh_token`.
> Those are solely in cookies.

---

### `POST /auth/refresh`

**Request:** No body. Uses `refresh_token` cookie.

**Response 200**

```json
{
  "user": {
    "id": "string",
    "email": "string",
    "name": "string",
    "role": "USER | ADMIN | SUPERADMIN"
  }
}
```

**Side effects:** Rotates `access_token` + `refresh_token` cookies, refreshes
`role` cookie.

> The response body must **not** contain tokens. They are solely in cookies.

---

### `POST /auth/logout`

**Request:** No body.

**Response 200**

```json
{ "message": "Logout realizado com sucesso." }
```

**Side effects:** Clears all three cookies, revokes the refresh token in DB.

---

### `POST /auth/register`

**Request body**

```json
{ "name": "string", "email": "string", "password": "string" }
```

**Response 201**

```json
{ "message": "Usuário cadastrado com sucesso.", "user": { ... } }
```

No cookies set. Frontend calls `/auth/login` immediately after.

---

### `POST /auth/forgot-password`

**Request body**

```json
{ "email": "string" }
```

**Response 200**

```json
{ "message": "Se o email existir, um link de redefinição foi enviado." }
```

Always returns 200 (don't leak whether email exists). Side effect: creates a
`PasswordResetToken` (hashed, expires in 1h). In dev the token is returned in
the response body for testing (no mailer). In production it is emailed.

---

### `POST /auth/reset-password`

**Request body**

```json
{ "token": "string", "newPassword": "string" }
```

**Response 200**

```json
{ "message": "Senha redefinida com sucesso." }
```

Side effects: hashes new password, updates user, revokes the reset token,
revokes all existing refresh tokens for the user (force re-login).

---

### `GET /user/me`

**Auth:** `access_token` cookie (JWT guard).

**Response 200**

```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "role": "USER | ADMIN | SUPERADMIN",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

---

### `GET /anime?search=...&page=...&limit=...`

Public, no auth.

**Query params**

| Param  | Type   | Default | Notes                                  |
| ------ | ------ | ------- | -------------------------------------- |
| search | string | —       | Case-insensitive LIKE on `Anime.title` |
| page   | number | 1       |                                        |
| limit  | number | 10      | Max 100                                |

**Response 200**

```json
{
  "data": [ { ...anime, "genres": [...] } ],
  "meta": { "total": 0, "page": 1, "limit": 10, "totalPages": 0 }
}
```

---

## 401 interceptor

When the frontend gets a 401 on any non-auth route, it transparently calls
`POST /auth/refresh` and retries the original request once. If the refresh
also fails, the user is logged out.

## CORS

Backend must set:

```
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
```

In production, `CORS_ORIGIN` = the frontend origin(s).

## Environment variables (backend)

| Variable                | Required | Example                              |
| ----------------------- | -------- | ------------------------------------ |
| `JWT_ACCESS_SECRET`     | yes      | 32+ char random string               |
| `JWT_REFRESH_SECRET`    | yes      | 32+ char random string               |
| `JWT_ACCESS_EXPIRES_IN` | no       | `7d` (default)                       |
| `JWT_REFRESH_EXPIRES_IN`| no       | `30d` (default)                      |
| `JWT_COOKIE_SECURE`     | yes prod | `true` in prod, `false` in dev      |
| `JWT_COOKIE_SAMESITE`   | no       | `lax` (default)                      |
| `JWT_COOKIE_DOMAIN`     | no       | `.animesice.io` for prod cross-sub   |
| `CORS_ORIGIN`           | yes      | `http://localhost:3000`              |
| `CORS_CREDENTIALS`      | yes      | `true`                               |
| `FRONTEND_URL`          | yes      | `http://localhost:3000` (reset link) |
