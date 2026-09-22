# 4frames-web-app — Architecture Guide

React + TypeScript + Vite frontend for 4frames-core-api. Read this before adding or
changing any feature.

## Stack

- React 19, TypeScript, Vite
- `react-router-dom` for routing
- React Context for shared app state (no external state library)
- Vitest + React Testing Library for tests
- Plain CSS (no CSS-in-JS, no Tailwind). Palette: white / gray / dark green, solid colors only, no gradients.

## Folder structure

```
src/
  features/
    <feature-name>/
      api/            one file per resource, thin wrappers around lib/http.ts
      components/     one .tsx per screen/component + its .css + its .test.tsx
      context/         only if the feature owns shared state (see auth/)
  routes/             route-level composition: layouts, guards, route trees
  lib/                cross-feature utilities (http client, generic helpers)
  styles/             shared.css — cross-feature CSS primitives (.card, .btn-primary, etc.)
  test/               global test setup
```

Each feature is self-contained: its own `api/`, `components/`, optional `context/`.
Cross-feature code only lives in `lib/`, `routes/`, or `styles/` — never import one
feature's internals from another feature directly (route through `routes/` instead).

Current features: `auth`, `convert`, `my-videos`, `job-status`.

## Adding a new feature

1. Create `src/features/<name>/api/<name>-api.ts`:
   - Import `apiFetch` and `ApiError` from `../../../lib/http`.
   - Export one async function per operation, typed request/response.
   - Never call `fetch` directly — always go through `apiFetch` so auth headers and
     error handling stay consistent.

2. Create `src/features/<name>/components/<Name>Page.tsx`:
   - One component per screen. Co-locate its stylesheet as `<name>-page.css` in the
     same folder, imported at the top of the component file.
   - Use shared primitives from `styles/shared.css` first (`.page`, `.card`,
     `.card--wide`, `.btn-primary`, `.btn-secondary`, `.error`, `.success`,
     `.logo-mark`). Only add feature CSS for what's not already shared.
   - Pull auth/session via `useAuth()` from `features/auth/context/use-auth` if the
     feature needs the token or current user.
   - No inline `style={}` props — always a CSS class.

3. Wire it into routing in `src/App.tsx`:
   - Public routes go directly under `<Routes>`.
   - Authenticated routes go inside `<Route element={<ProtectedRoute />}>` and,
     if they should share the app header/nav, inside `<Route element={<AppLayout />}>`
     as well.
   - Add a nav link in `src/routes/AppLayout.tsx` if the feature is a primary
     destination.

4. Add a test file `<Name>Page.test.tsx` next to the component:
   - Mock the feature's `api/` module with `vi.spyOn`, never mock `fetch` directly.
   - Wrap the component in `MemoryRouter` (+ `AuthProvider` if it uses auth context).
   - Test behavior visible to the user (renders, form submit, error/success states),
     not implementation details.

## Context conventions (only needed for state shared across a feature)

Split into three files to satisfy the `react-refresh/only-export-components` lint
rule (a file exporting a component must export nothing else):

- `context.ts` — `createContext` call + the context's TypeScript interface. No components.
- `<name>-context.tsx` — the `<Name>Provider` component only.
- `use-<name>.ts` — the `use<Name>()` hook that reads the context and throws if
  used outside its provider.

See `features/auth/context/` for the reference implementation. The JWT session is stored in
`localStorage` (`4frames.session`) so it is shared across tabs on the same origin; the `storage`
event keeps React state in sync when another tab logs in or out.

## HTTP conventions

- All requests go through `lib/http.ts`'s `apiFetch(path, init, token?)`.
- `VITE_API_URL` (see `.env.example`) is the core-api base URL, defaults to
  `http://localhost:3000`.
- Auth: pass the JWT as the third argument to `apiFetch`; it's sent as
  `Authorization: Bearer <token>`. Get the token from `useAuth().session?.accessToken`.
- Non-2xx responses throw `ApiError` (has `.status` and a message pulled from the
  JSON body's `message` or `error` field, matching core-api's error shape). Catch it
  with `err instanceof ApiError` to show a specific message, otherwise assume a
  network/connectivity failure.

## Commands

```bash
pnpm dev       # start dev server
pnpm test      # run vitest once
pnpm lint      # eslint
pnpm format    # prettier for the whole repo (format:check to verify)
pnpm exec tsc -b   # type-check
pnpm build     # type-check + production build
```

Run `pnpm exec tsc -b`, `pnpm lint`, `pnpm format:check`, and `pnpm test` before considering any change done.

Formatting follows `.prettierrc.json` (single quotes, semicolons, no trailing commas, 120 columns).
A Husky `pre-commit` hook runs lint-staged on staged files: `prettier --write` then `eslint --fix`
for `*.ts`/`*.tsx`/`*.js`, and `prettier --write` for css/html/md/json/yml (config in `package.json`).

## Product flow

This is a video-to-frames conversion app. The user flow is:

1. `/login` — authenticate (`features/auth`).
2. `/convert` (`features/convert`) — pick/drop **one or more** videos (up to
   `MAX_BATCH_UPLOAD_FILES` in `convert-api.ts`), click **Converter**. For each file,
   in parallel:
   1. `POST /videos` (`UPLOAD_PENDING` + presigned S3 upload URL);
   2. `PUT` to that URL (bytes bypass the API);
   3. `POST /videos/:jobId/complete` → `QUEUED`.
      All three steps must run per file — skipping `complete` leaves the job stuck in
      `UPLOAD_PENDING`. On success, navigate to `/my-videos`.
3. `/my-videos` (`features/my-videos`) — lists every conversion job for the logged-in
   user, most recent first, via `GET /videos?limit=&offset=` (default page size 20,
   "Carregar mais" when more items exist). Each row links to `/jobs/:jobId`.
   Polls the same endpoint every 3s while any visible job is not terminal (`DONE`/
   `FAILED`/`EXPIRED`). Status labels: `features/job-status/status-label.ts`.
4. `/jobs/:jobId` (`features/job-status`) — shareable status page. Polls
   `GET /videos/:jobId` every 3s until terminal; download via
   `GET /videos/:jobId/download` when `DONE`. `jobId` is the API UUID (string).
   - **Cancelar** while `UPLOAD_PENDING`/`QUEUED` → `POST /videos/:jobId/cancel`;
     backend uses `EXPIRED` for user cancel; `wasCanceledByUser` shows "Cancelado".
   - **SSE** while `PROCESSING`: `openVideoJobEventsStream` + `<progress>` from
     `job.progress`; poll remains source of truth for `status`.

There is no separate "download" feature folder — download lives inside `job-status`.

## Known gaps

- Vitest coverage is thin outside `LoginPage` and `MyVideosPage` (see each feature's tests).
- Email on `job.done`/`job.failed` is sent by `apps/notifier`; the UI does not surface it.
- `GET /videos/:jobId/events` uses `?token=` (EventSource cannot send `Authorization`);
  `openVideoJobEventsStream` is the intentional exception to routing everything through `apiFetch`.
