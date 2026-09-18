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

See `features/auth/context/` for the reference implementation.

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

1. `/login` — authenticate.
2. `/convert` (`features/convert`) — pick/drop a video, click **Converter**. This:
   1. calls `POST /videos` (creates the job as `UPLOAD_PENDING`, returns a
      presigned S3 upload URL);
   2. `PUT`s the file straight to that URL (bytes bypass the API);
   3. calls `POST /videos/:jobId/complete` (confirms the object landed in S3,
      advances the job to `QUEUED`);
   4. navigates to `/jobs/:jobId` — no manual ID entry by the user.
      All three API calls must happen in order before navigating — skipping step 3
      is a real bug that was shipped once already (the job silently stays stuck in
      `UPLOAD_PENDING` forever, since nothing else advances its status).
3. `/jobs/:jobId` (`features/job-status`) — a shareable, standalone status page.
   Polls `GET /videos/:jobId` every 3s for status
   (`UPLOAD_PENDING`/`QUEUED`/`PROCESSING`/`DONE`/`FAILED`/`EXPIRED`), stops polling
   once terminal, and reveals a download button that calls
   `GET /videos/:jobId/download` when `DONE`. The URL is meant to be copy/pasted
   and shared — the `jobId` in the path is the correlation point, not something the
   user types in manually anywhere.
   - While `UPLOAD_PENDING`/`QUEUED`, a **Cancelar** button calls
     `POST /videos/:jobId/cancel` (`cancelVideoJob` in `job-status-api.ts`), then
     immediately re-runs `fetchStatus()` instead of waiting for the next poll tick.
     The backend reuses the `EXPIRED` status for "canceled by the user" (no separate
     `CANCELLED` status exists — see `VideoJobService.cancelIfPending` in the API).
     `JobStatusPage` tracks this locally with a `wasCanceledByUser` flag set right
     after a successful cancel, and renders "Cancelado" (neutral gray box) instead
     of "Expirado" (red error box) in that case — a job that reaches `EXPIRED` on
     its own (timeout, never canceled) still shows "Expirado" normally. If you ever
     see a job show "Expirado" right after clicking Cancelar, this flag is what's
     supposed to prevent that — check it wasn't lost across a remount/navigation.
   - While `PROCESSING`, the page opens a second, independent channel —
     `openVideoJobEventsStream` (`EventSource` against
     `GET /videos/:jobId/events?token=<accessToken>`, since `EventSource` can't send
     an `Authorization` header) — and renders a `<progress>` bar from `job.progress`
     events (`{ type, jobId, userId, percent }`) once at least one has arrived; before
     that, the spinner still shows so a 0% bar never lies about position. `job.done`
     and `job.failed` events close the stream client-side and trigger an immediate
     `fetchStatus()`, but the 3s poll of `GET /videos/:jobId` stays the source of
     truth for `status` itself — the stream only supplies incremental progress. The
     `EventSource`'s own `onerror` (it auto-reconnects) is deliberately swallowed,
     not surfaced as a page error, for the same reason. A `{ type: 'error', message }`
     event (written by the API when the Redis subscription itself fails — see
     `GetVideoJobEventsController` in the backend) is part of the `VideoJobEvent`
     union and is handled by closing the client-side stream; it does not surface as
     a page error either, since polling remains the fallback. The stream is closed
     on unmount, on `jobId` change, and once `status` leaves `PROCESSING`.
   - Progress percentages are real ffmpeg output (`-progress pipe:1` parsed against
     the real duration from `ffprobe`), not simulated — see the backend's CLAUDE.md,
     "Real-time progress" section, if progress looks like it jumps: that's the
     throttle (max 1 update/second) plus fixed checkpoints for the zip/upload steps,
     most visible on short videos.

There is no "download" feature folder — download lives inside `job-status` because
it's gated by that job's status, not a standalone destination.

4. `/my-videos` (`features/my-videos`) — lists every conversion job for the logged-in
   user, most recent first, via `GET /videos?limit=&offset=` (offset/limit
   pagination, default page size 20, with a "Carregar mais" button once more items
   remain than are loaded). Each row is a `<Link to={`/jobs/${jobId}`}>` into the
   existing `job-status` page — no polling or download logic is duplicated here.
   Empty state links to `/convert`. The status label mapping is shared with
   `job-status` via `features/job-status/status-label.ts` (`STATUS_LABEL`) rather
   than duplicated.

**Live progress**: implemented per ADR-001 — `GET /videos/{jobId}/events` is an SSE
stream (fed by Redis Pub/Sub from the worker), not WebSocket, since the flow is
server→client only and SSE composes with the stateless multi-replica API without
sticky sessions. See point 3 above for how `job-status` wires it in.

## Known gaps

- `4frames-core-api` implements `POST /auth`, `POST /videos`, `POST /videos/:jobId/complete`,
  `POST /videos/:jobId/cancel`, `GET /videos/:jobId` (status),
  `GET /videos/:jobId/events` (SSE progress), `GET /videos` (list, used by
  `features/my-videos`) and `GET /videos/:jobId/download`. `video_jobs.id` is a
  UUID, not a sequential ID, so `jobId` throughout the frontend (route params, API
  clients) is a string.
- `GET /videos/:jobId/events` authenticates via `?token=` query param instead of
  the `Authorization` header used everywhere else, because the browser's native
  `EventSource` can't set custom headers. That's why `openVideoJobEventsStream`
  builds the URL by hand instead of going through `apiFetch` — it's the one
  intentional exception to "never call `fetch`/a raw request API directly", not a
  pattern to copy for anything else.
