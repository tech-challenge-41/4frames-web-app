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
pnpm exec tsc -b   # type-check
pnpm build     # type-check + production build
```

Run `pnpm exec tsc -b`, `pnpm lint`, and `pnpm test` before considering any change done.

## Product flow

This is a video-to-frames conversion app. The user flow is:

1. `/login` — authenticate.
2. `/convert` (`features/convert`) — pick/drop a video, click **Converter**. This
   calls `POST /videos` (creates the job, returns a presigned S3 upload URL), then
   `PUT`s the file straight to that URL. On success it navigates to `/jobs/:jobId` —
   no manual ID entry by the user.
3. `/jobs/:jobId` (`features/job-status`) — a shareable, standalone status page.
   Polls `GET /videos/:jobId` every 3s for status
   (`UPLOAD_PENDING`/`QUEUED`/`PROCESSING`/`DONE`/`FAILED`/`EXPIRED`), stops polling
   once terminal, and reveals a download button that calls
   `GET /videos/:jobId/download` when `DONE`. The URL is meant to be copy/pasted
   and shared — the `jobId` in the path is the correlation point, not something the
   user types in manually anywhere.

There is no "download" feature folder — download lives inside `job-status` because
it's gated by that job's status, not a standalone destination.

## Known gaps

- `4frames-core-api` currently only implements `POST /auth` and `POST /videos`
  (creates a job + returns a presigned upload URL). `GET /videos/:jobId` (status)
  and `GET /videos/:jobId/download` — both consumed by `features/job-status` —
  don't exist yet on the API. The frontend clients assume the contract documented
  in `job-status-api.ts` and must be reconciled once those endpoints ship.
- The `jobId` used in the `/jobs/:jobId` URL is today the raw sequential database
  ID (`SERIAL`). It works but is enumerable/guessable, which is a bad property for
  a URL meant to be shared publicly. If/when the backend exposes a non-sequential
  identifier (UUID or short hash) for jobs, switch the route param and API calls to
  use that instead.
