## 1. Request list display resolution

- [ ] 1.1 Add `variables: FileVariable[]` to `RequestListProps` in `src/components/RequestList.tsx` (import the type from `../core/types`)
- [ ] 1.2 Inside `RequestList`, for each `visibleRequests` entry, call `resolveVariables(request, variables, baseDir)` (import from `../core/variables`) to obtain a `ResolvedRequest`, then call `getRequestTarget(resolved.url)` for the display target. Pass `baseDir` as `dirname(state.filePath)` from the new prop (see 1.3) so `{{$dotenv}}` resolution matches the send path
- [ ] 1.3 Add `baseDir?: string` to `RequestListProps` (the directory of the loaded `.http` file) and thread it from `app.tsx` as `dirname(state.filePath)`
- [ ] 1.4 Keep the `key` on each rendered `<Text>` stable: continue using `${request.lineNumber}-${request.method}-${request.url}` with the **raw** `request.url` (not the resolved one), so list item identity is stable across re-renders/env switches
- [ ] 1.5 In the `horizontalOffset > 0` branch, build `fullLine` from the **resolved** target (same `target` computed in 1.2), so horizontal scrolling slices the same text that is rendered in the non-scrolling branch

## 2. Horizontal-scroll width calc resolution

- [ ] 2.1 In `src/core/reducer.ts`, change `getMaxRequestLineWidth` signature to `getMaxRequestLineWidth(requests: readonly { url: string }[], variables: FileVariable[], baseDir?: string)`
- [ ] 2.2 Update the implementation to resolve each request URL via `resolveVariables({ ...r, method: r.method ?? 'GET' } , variables, baseDir)` (or a lightweight shape acceptable to `resolveVariables`) before calling `getRequestTarget`. If `resolveVariables` requires a full `ParsedRequest`, build the minimal shape (`{ method, url, headers: {}, body: undefined }`) — confirm the `ParsedRequest` type's required fields and satisfy them
- [ ] 2.3 Update the two callers of `getMaxRequestLineWidth` in `reducer.ts` (in `SCROLL_HORIZONTAL` and `JUMP_HORIZONTAL`) to pass `state.variables` and `dirname(state.filePath)` alongside `state.requests`. Re-check the existing `JUMP_HORIZONTAL`/`SCROLL_HORIZONTAL` tests in `test/core/horizontal-scroll-boundary.test.ts` — they drive the reducer directly, so they may need `variables: []` added to their initial state (see 4.3)

## 3. App wiring

- [ ] 3.1 In `src/app.tsx`, pass `variables={state.variables}` and `baseDir={dirname(state.filePath)}` to `<RequestList>` in the `left=` slot of `<Layout>`. `dirname` is already imported in `app.tsx`
- [ ] 3.2 Confirm `state.variables` is the merged map (it is: initialized from `props.variables` and recomputed by `SWITCH_ENV`, `RELOAD_FILE`, `LOAD_FILE` via `mergeVariables`) so no further plumbing is needed for `--env` / `E` reactivity — add a one-line comment above the prop citing `SWITCH_ENV`/`RELOAD_FILE`/`LOAD_FILE` as the recompute triggers
- [ ] 3.3 Run `npm run build` (tsc + tsup) and `npm run lint` to confirm no type or lint regressions

## 4. Unit tests

- [ ] 4.1 Create `test/components/RequestList.test.tsx` using `ink-testing-library` (follow `test/components/EnvSelectOverlay.test.tsx` for the render-and-assert pattern). Import `RequestList` from `../../src/components/RequestList`
- [ ] 4.2 Test: rendering with a file variable — given requests with `url: '{{baseUrl}}/posts'` and `variables: [{ name: 'baseUrl', value: 'https://api.example.com' }]`, the rendered output contains `GET /posts` and does NOT contain `{{baseUrl}}`
- [ ] 4.3 Test: rendering with nested file variables — `@hostname = api.example.com`, `@baseUrl = https://{{hostname}}`, `GET {{baseUrl}}/posts` — the output contains `GET /posts`
- [ ] 4.4 Test: unresolved variable fallback — `url: '{{unknown}}/posts'`, `variables: []` — the output contains `{{unknown}}/posts` (current behavior preserved)
- [ ] 4.5 Test: environment override takes precedence — same request `GET {{baseUrl}}/posts` with file `baseUrl = https://api.local` and environment `baseUrl = https://api.dev.com` merged into `variables` (use `mergeVariables`) — the output contains `GET /posts` resolved against the env value's hostname (both resolve to `/posts`, so assert the URL passed to the details/send path resolves to `api.dev.com`; for the list test itself, the pathname equality is the assertion)
- [ ] 4.6 Add a reducer unit test in `test/core/request-list-scroll.test.ts` (or a new `test/core/request-list-display.test.ts`) verifying `getMaxRequestLineWidth` returns a length consistent with the resolved path: e.g. with `url: '{{baseUrl}}/very-long-path'` and `baseUrl = https://x.io`, the computed width equals `2 + 7 + '/very-long-path'.length` (not the raw URL length)

## 5. Integration tests

- [ ] 5.1 Add an integration test in `test/integration/` (follow the existing integration test style for `App` rendering via `ink-testing-library` driving `useInput` if that pattern exists; otherwise drive the reducer directly through `createInitialState` + `reducer` and assert state) covering: load `variables.http`, verify the list shows `GET /posts`; dispatch `SWITCH_ENV` with an environment that overrides `baseUrl` to a different host; verify the list still shows `GET /posts` (same pathname) and that sending the request would target the env host (assert via `resolveVariables(request, state.variables, baseDir).url`)
- [ ] 5.2 Add an integration test verifying file reload re-resolves the list: initial state with `@baseUrl = https://a.com`, dispatch `RELOAD_FILE` with new variables `@baseUrl = https://b.com`, assert `getMaxRequestLineWidth` (or the rendered list) reflects the new pathname resolution

## 6. Regression and verification

- [ ] 6.1 Manually run `httptui examples/basic.http` and confirm the request list still shows `GET /users`, `POST /users`, etc. (no regression for the non-variable case)
- [ ] 6.2 Manually run `httptui examples/variables.http` and confirm the request list shows `GET /posts`, `POST /posts`, etc. (variables resolved)
- [ ] 6.3 Manually run `httptui examples/variables.http --env <env file overriding baseUrl>` (use `staging-env.json` if it overrides `baseUrl`; otherwise craft a minimal env file) and confirm the list pathnames reflect the env override; press `E`, switch to `(none)`, confirm the list reverts without a reload
- [ ] 6.4 Run `npm test` — all existing tests pass (fix any `getMaxRequestLineWidth` callers in existing tests that now need the new parameters; pre-existing failing tests, if any, are noted but not attributed to this change)
- [ ] 6.5 Run `npm run lint` and `npm run build` once more after all test changes; confirm zero errors on changed files (`src/components/RequestList.tsx`, `src/core/reducer.ts`, `src/app.tsx`) via `lsp_diagnostics`