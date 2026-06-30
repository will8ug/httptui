## Context

httptui parses `.http` files into an in-memory `ParseResult` (`{ requests: ParsedRequest[], variables: FileVariable[] }`). Each `ParsedRequest` carries the **raw** URL as written in the file, e.g. `"{{baseUrl}}/posts"`. Variables are resolved in a separate pass, implemented by `resolveVariables` in `src/core/variables.ts`, which handles nested file variables (a file variable may reference another), system variables (`{{$timestamp}}`, `{{$guid}}`, `{{$randomInt}}`, `{{$processEnv}}`, `{{$dotenv}}`), and environment-file overrides.

The application has a single reducer (`src/core/reducer.ts`) and one `useInput` block (`src/app.tsx`). Three consumers touch a request URL before this change:

| Consumer | Path | Resolves variables? |
|---|---|---|
| Request details panel (`app.tsx:88` via `resolveRequestDetails`) | `resolveVariables` → display | ✅ |
| Send request (`app.tsx:115`) | `resolveVariables` → `executeRequest` | ✅ |
| Details width calc (`reducer.ts:71`) | `resolveVariables` → `getDetailsTotalLines` | ✅ |
| **Request list display (`RequestList.tsx:51`)** | `getRequestTarget(request.url)` raw | ❌ |
| **Request list horizontal-max width (`reducer.ts:39`)** | `getRequestTarget(r.url)` raw | ❌ |

`getRequestTarget` (in `src/utils/request.ts`) is a pure helper: it calls `new URL(url)` and returns `${pathname}${search}`, falling back to returning the input string verbatim when `new URL()` throws. For a raw URL like `{{baseUrl}}/posts`, `new URL()` throws and the fallback returns the unresolved string — that is what the user sees.

`state.variables` is the merged variable map (`fileVariables` merged with the active `environmentVariables` via `mergeVariables`). It is recomputed on `LOAD_FILE`, `RELOAD_FILE`, and `SWITCH_ENV`. The request details panel already receives it (`app.tsx:592`); the request list does not.

## Goals / Non-Goals

**Goals:**
- The request list shows the same `METHOD /path` that the send/details path resolves, for every request.
- The displayed path reacts to `--env` / `-E` selection and to the in-TUI `E` environment switcher without additional wiring beyond threading `state.variables`.
- The horizontal-scroll width calculation for the request list (`getMaxRequestLineWidth`) is consistent with the rendered text, so `0`/`$`/`←`/`→` navigation bounds match what the user sees.
- Resolution failures (unknown `{{var}}`, missing `{{$processEnv X}}`, etc.) fall back to the current behavior: the raw URL string is shown. No new error surface, no failed render.

**Non-Goals:**
- Caching/pre-computing resolved display URLs in state. `resolveVariables` is cheap (regex + map lookups), the request list panel renders only the visible window (sliced by `scrollOffset` + `visibleHeight`), and `state.variables` already changes identity on every env switch / reload — a memoized selector would add complexity for no measurable win. Re-resolution on each render is acceptable and matches how the details panel already works.
- Changing `getRequestTarget` itself. The helper is correct; the bug is that its callers feed it raw URLs. The fallback branch is the desired failure mode and stays intact.
- Resolving system variables to a "stable" value for display. `{{$timestamp}}` and `{{$guid}}` are intentionally fresh on each resolution; the list shows whatever value they produce at render time, exactly as the details panel does. This is accepted as a minor UX wrinkle (the displayed path may change on re-render) rather than forbidden, because (a) it matches existing details-panel behavior and (b) pinning them would contradict the variables spec's "fresh each time" requirement.
- Changing file-save (`S`) behavior. `serializeHttpFile` continues to write `{{var}}` placeholders verbatim; only the on-screen display changes.
- Adding a settability/toggability affordance for "show raw vs. resolved" in the list. The list always shows resolved (with the unresolved-fallback safety net).

## Decisions

### Decision: Resolve inside the display path (option a), not in reducer state

`RequestList.tsx` receives `variables: FileVariable[]` as a new prop and calls `resolveVariables(request, variables)` per visible request before invoking `getRequestTarget(resolved.url)`. Same shape for `getMaxRequestLineWidth` in `reducer.ts`, which already has `state.variables` in scope.

**Alternatives considered:**
- **(b) Store a pre-resolved `displayUrl` on each request in reducer state.** Rejected: it requires new state fields, recomputation on every `SWITCH_ENV` / `RELOAD_FILE` / `LOAD_FILE` action, and parallel plumbing through `ParsedRequest`-shaped data. It is strictly more invasive than threading one prop, for no runtime benefit (render-window resolution is cheap).
- **Fix inside `getRequestTarget` by auto-resolving.** Rejected: `getRequestTarget` is a pure string→string utility in `src/utils/`; pulling `resolveVariables` (and a `FileVariable[]` parameter) into it entangles a URL-parsing helper with the variable subsystem and forces every caller — including the send path, which has *already* resolved — to pass variables or ignore them. The bug is in the callers that skip resolution, not in the helper.

### Decision: Thread `state.variables` (not `state.fileVariables`) into the list

`state.variables` is the merged map (`fileVariables` + active `environmentVariables`) and is the same value already passed to `resolveRequestDetails` for the details panel. Using it ensures the list reacts to `--env` / `-E` / the `E` switcher without any extra wiring: `SWITCH_ENV` already recomputes `state.variables` via `mergeVariables`, and React re-renders the list with the new prop.

**Alternatives considered:**
- Pass `fileVariables` only and let the list "miss" environment overrides — rejected: violates the user requirement that the list react to `E`.
- Pass both `fileVariables` and `environmentVariables` and merge inside the component — rejected: duplicates `mergeVariables` logic that the reducer already owns.

### Decision: Resolution failure preserves today's behavior

`resolveVariables` already leaves unknown placeholders in place: `replacePlaceholders` returns `original` when the resolver returns `undefined` (e.g. `resolvedFileVariables.get(expr) ?? original` in `resolveRequestValue`). `{{$processEnv MISSING}}` also returns `undefined` and falls back to the original string. When the resulting URL still contains `{{...}}`, `new URL()` throws and `getRequestTarget` returns the input verbatim — identical to today's output for `variables.http`'s unresolved case. No new try/catch, no new logging, no new fallback path is introduced.

**Alternatives considered:**
- Catch resolution failures in the list and render a placeholder/error — rejected: adds UI surface the user didn't ask for; the current "show the raw URL" behavior is the agreed fallback.
- Mask unresolved placeholders to `?` — rejected: loses information the user may want (which variable is missing).

### Decision: Apply the same fix to `getMaxRequestLineWidth` in `reducer.ts`

`getMaxRequestLineWidth(state.requests)` currently calls `getRequestTarget(r.url)` on raw URLs. After the fix it resolves each URL with `state.variables` before measuring, so the computed max width matches the rendered text and `0`/`$`/`←`/`→` horizontal navigation bounds are consistent. The function signature gains a `variables: FileVariable[]` parameter (callers in `reducer.ts` already have `state.variables`).

### Decision: Resolve per visible request, not per all requests

`RequestList` slices `requests` to `visibleRequests` before rendering. Resolution runs on the visible slice only. For typical `.http` files (tens of requests, panel shows ~10–30), the difference is negligible, but the principle holds: resolution cost scales with visible rows, not file size. `getMaxRequestLineWidth` walks all requests because it must compute the global max — this is acceptable since horizontal-scroll bounds are recomputed only on scroll/selection actions, not on every keystroke.

## Risks / Trade-offs

- **[System-variable freshness in a static list]** `{{$timestamp}}` / `{{$guid}}` / `{{$randomInt}}` are re-resolved on every render, so a path containing them (e.g. `GET {{baseUrl}}/posts/{{$randomInt 1 100}}`) may visually "flicker" on any re-render. → **Mitigation**: this matches the details panel's existing behavior and the variables spec's "fresh each time" requirement; the user explicitly opted into the resolved display. If it becomes annoying, a follow-up change can pin system-variable resolution for display only — out of scope here.
- **[Variable resolution on every render]** `resolveVariables` runs on each React render of `RequestList`. → **Mitigation**: render is limited to the visible window; `resolveVariables` is regex + Map lookups, no I/O except `{{$dotenv}}` (which is cached on the `ResolutionContext`). The cache is per-call, however, so `{{$dotenv}}` will re-read the `.env` file on each render. If profiling shows this is hot, a follow-up can memoize the dotenv map on `state` — left as a known wrinkle, not addressed here because the details panel already pays the same cost.
- **[Mismatch between list-display resolution and send-time resolution]** The list calls `resolveVariables(request, variables)` without `baseDir`, so `{{$dotenv X}}` resolves against CWD only, whereas the send path (`app.tsx:115`) passes `dirname(state.filePath)` as `baseDir`. → **Mitigation**: thread `dirname(state.filePath)` into the `RequestList` call to match the send path exactly. Added to the tasks; without it, `{{$dotenv}}` would resolve differently between list and send, which would be a real bug.
- **[Horizontal-width calc now depends on variables]** `getMaxRequestLineWidth` becomes variable-dependent. Existing callers pass `state` (which holds `variables`), so this is a signature extension, not a behavioral break. → **Mitigation**: tests cover both "no variables" and "with env override" cases.