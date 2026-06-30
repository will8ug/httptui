## Why

The request list panel displays `METHOD {{baseUrl}}/posts` instead of `METHOD /posts` when a `.http` file uses file-level variables. The display path (`RequestList.tsx`, `getMaxRequestLineWidth` in `reducer.ts`) calls `getRequestTarget(request.url)` on the **raw** URL, which fails `new URL()` parsing and falls back to returning the unresolved string verbatim. The send path and details panel already resolve variables before use — the list display is the only consumer that forgot to. Users see templated placeholders where they should see the resolved path, and the list does not react to `--env` / `E` environment switches despite the rest of the app doing so.

## What Changes

- Resolve file/system/environment variables before extracting the display path in `src/components/RequestList.tsx`, so the list shows `METHOD /posts` for `GET {{baseUrl}}/posts`.
- Apply the same resolution in `getMaxRequestLineWidth` (`src/core/reducer.ts`) so horizontal scroll width is computed against the resolved path, matching what is rendered.
- Thread `state.variables` (the merged file + environment variable map already used by the details panel and the send path) into the request list display path. Because `state.variables` is recomputed on `SWITCH_ENV` and `RELOAD_FILE`, the list reacts to environment switches and file reloads for free.
- Preserve current behavior on resolution failure: if `resolveVariables` leaves `{{...}}` placeholders (e.g. unknown variable, `{{$processEnv MISSING}}`), `getRequestTarget` still falls back to returning the URL string as-is. No new error path is introduced.

## Capabilities

### New Capabilities
<!-- None. This is a fix to an existing display behavior; no new capability is introduced. -->

### Modified Capabilities
- `tui`: The request-list panel SHALL display the **resolved** request path (method + pathname) rather than the raw URL, reacting to file and environment variable changes. Previously the spec only described the `METHOD /path` format without specifying resolution; this adds an explicit resolution requirement and a fallback rule for unresolved placeholders.

## Impact

- **Modified code:**
  - `src/components/RequestList.tsx` — accepts a new `variables: FileVariable[]` prop and resolves each request before computing the display target.
  - `src/core/reducer.ts` — `getMaxRequestLineWidth` resolves each request URL before measuring.
  - `src/app.tsx` — passes `state.variables` into `<RequestList>`.
- **No new modules, no new dependencies, no new actions/reducer cases.** The fix reuses existing `resolveVariables` and `getRequestTarget` functions; no state shape changes.
- **Behavior is additive for the user and conservative on failure:** known variables get resolved in the list; unresolved placeholders produce the same display as today (raw URL fallback).
- **Tests:** unit tests for `RequestList` rendering with variables, `getMaxRequestLineWidth` with variables, and an integration test that the list updates when `SWITCH_ENV` is dispatched.