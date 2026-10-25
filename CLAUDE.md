# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project goal

Frontend for a vocabulary ("word book") app. Current task: **redesign the visual appearance only**. Do not change API calls, request/response shapes, routes, auth flow, or state/data structure — only markup/styling.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc -b && vite build` (type-checks, outputs to `dist/`)
- `npm run lint` — ESLint (flat config in `eslint.config.js`)
- `npm run preview` — serve the built `dist/`

No test runner is configured. Not a git repository.

## Environment

`.env` defines `VITE_API_BASE_URL` (backend base URL; falls back to `""`, i.e. same-origin). `vite.config.ts` has no dev proxy.

## Architecture

React 19 + TypeScript + Vite, `react-router-dom` v7, `axios`. No state library.

- `src/main.tsx` → `src/App.tsx`: `BrowserRouter` > `AuthProvider` > `Routes`. Public: `/login`, `/signup`, `/oauth/callback`. Protected (via `auth/PrivateRoute`, an `<Outlet/>` guard): `/` (HomePage), `/wordbook` (WordBookPage). Unknown paths redirect to `/`.
- **Auth** (`src/auth/AuthContext.tsx`, `src/hooks/useAuth.ts`): the access token lives in `sessionStorage["accessToken"]`; `isAuthenticated` is derived from its presence. `login` POSTs `/login`; `logout` POSTs `/api/v2/jwt/logout`. `setAccessToken` is used by the OAuth callback page. The refresh token is an HttpOnly cookie (hence `withCredentials: true`).
- **API client** (`src/api/axiosInstance.ts`): single shared axios instance. The request interceptor attaches `Bearer` token; the response interceptor handles 401 by POSTing `/api/v2/jwt/exchange` to get a new token, queuing concurrent failed requests, retrying them, and redirecting to `/login` on failure. Always use this instance (not bare `axios`) for backend calls.
- **Pages** (`src/pages/*`) are large, self-contained components (HomePage ~600 lines, WordBookPage ~460, SignupPage ~350) that call `api` directly and keep their own local state and types. Endpoints are all under `/api/v2/...` (usage, wordbook, wordbookword, wordbooklike, openai/search, mail, user, jwt).

## Styling (important for the redesign)

- Pages are styled with **Tailwind-style utility classes in `className`** (no inline `style=`), but **Tailwind is not in `package.json` and no Tailwind config/plugin exists**, and `index.html` has no CDN. Verify whether these classes actually render before assuming they work; the redesign likely needs either adding Tailwind (`tailwindcss` + `@tailwindcss/vite` plugin, `@import "tailwindcss"` in CSS) or rewriting styles as plain CSS.
- Global CSS: `src/index.css` (CSS variables such as `--text`, `--bg`, `--border`, loaded in `main.tsx`) and `src/App.css` (leftover Vite template styles; `App.css` isn't imported anywhere).
- UI text is Korean; code comments are mostly Korean.
