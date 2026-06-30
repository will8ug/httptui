## 1. Request list display resolution

- [x] 1.1 Add `variables: FileVariable[]` to `RequestListProps` in `src/components/RequestList.tsx` (import the type from `../core/types`)
- [x] 1.2 Inside `RequestList`, for each `visibleRequests` entry, call `resolveVariables(request, variables, baseDir)` (import from `../core/variables`) to obtain a `ResolvedRequest`, then call `getRequestTarget(resolved.url)` for the display target. Pass `baseDir` as `dirname(state.filePath)` from the new prop (see 1.3) so `{{$dotenv}}` resolution matches the send path
- [x] 1.3 Add `baseDir?: string` to `RequestListProps` (the directory of the loaded `.http` file) and thread it from `app.tsx` as `dirname(state.filePath)`
- [x] 1.4 Keep the `key` on each rendered `<Text>` stable: continue using `${request.lineNumber}-${request.method}-${request.url}` with the **raw** `request.url` (not the resolved one), so list item identity is stable across re-renders/env switches
- [x] 1.5 In the `horizontalOffset > 0` branch, build `fullLine` from the **resolved** target (same `target` computed in 1.2), so horizontal scrolling slices the same text that is rendered in the non-scrolling branch

## 2. Horizontal-scroll width calc resolution

- [x] 2.1 In `src/core/reducer.ts`, change `getMaxRequestLineWidth` signature to `getMaxRequestLineWidth(requests: readonly ParsedRequest[], variables: FileVariable[], baseDir?: string)` (changed from `{ url: string }[]` to `ParsedRequest[]` since callers already pass `state.requests`)
- [x] 2.2 Update the implementation to resolve each request URL via `resolveVariables(r, variables, baseDir)` before calling `getRequestTarget`. `resolveVariables` accepts `ParsedRequest` directly — both callers pass `state.requests` which is `ParsedRequest[]`
- [x] 2.3 Update the two callers of `getMaxRequestLineWidth` in `reducer.ts` (in `SCROLL_HORIZONTAL` and `JUMP_HORIZONTAL`) to pass `state.variables` and `dirname(state.filePath)` alongside `state.requests`. Fixed existing test callers in `test/core/horizontal-scroll-boundary.test.ts:68` and `test/core/edge-jump.test.ts:125` to pass `[]` as variables

## 3. App wiring

- [x] 3.1 In `src/app.tsx`, pass `variables={state.variables}` and `baseDir={dirname(state.filePath)}` to `<RequestList>` in the `left=` slot of `<Layout>`. `dirname` is already imported in `app.tsx`
- [x] 3.2 Confirm `state.variables` is the merged map (it is: initialized from `props.variables` and recomputed by `SWITCH_ENV`, `RELOAD_FILE`, `LOAD_FILE` via `mergeVariables`) so no further plumbing is needed for `--env` / `E` reactivity — added a one-line comment above the prop
- [x] 3.3 Run `npm run build` (tsc + tsup) and `npm run lint` to confirm no type or lint regressions — build passes, lint errors are all pre-existing in untouched files

## 4. Unit tests

- [x] 4.1 Create `test/components/RequestList.test.tsx` using `ink-testing-library` (follow `test/components/EnvSelectOverlay.test.tsx` for the render-and-assert pattern). Import `RequestList` from `../../src/components/RequestList`
- [x] 4.2 Test: rendering with a file variable — given requests with `url: '{{baseUrl}}/posts'` and `variables: [{ name: 'baseUrl', value: 'https://api.example.com' }]`, the rendered output contains `GET /posts` and does NOT contain `{{baseUrl}}`
- [x] 4.3 Test: rendering with nested file variables — `@hostname = api.example.com`, `@baseUrl = https://{{hostname}}`, `GET {{baseUrl}}/posts` — the output contains `GET /posts`
- [x] 4.4 Test: unresolved variable fallback — `url: '{{unknown}}/posts'`, `variables: []` — the output contains `{{unknown}}` (current behavior preserved; assertion adjusted for terminal truncation)
- [x] 4.5 Removed redundant "environment override" test — env-over-file precedence is already covered in `test/core/variables.test.ts:250` (`mergeVariables` > "environment variables override file variables"). The RequestList rendering assertion (`toContain('/posts')`) could not distinguish env override from file var since `getRequestTarget` only returns the pathname.
- [x] 4.6 Reducer unit test in `test/core/request-list-display.test.ts` verifying `getMaxRequestLineWidth` returns a length consistent with the resolved path: with `url: '{{baseUrl}}/very-long-path'` and `baseUrl = https://x.io`, the computed width equals `2 + 7 + '/very-long-path'.length`; also tests unresolved fallback returns raw URL length

## 5. Integration tests

- [x] 5.1 Integration test in `test/integration/request-list-resolution.test.ts` covering: SWITCH_ENV updates the variable map so `resolveVariables(request, switchedState.variables).url` targets `https://api.dev.com/posts`; `getMaxRequestLineWidth` computes against resolved `/posts`; switching back to `(none)` reverts to `https://api.local/posts`
- [x] 5.2 Integration test verifying RELOAD_FILE re-resolves the list: initial state with `@baseUrl = https://a.com`, dispatch `RELOAD_FILE` with new variables `@baseUrl = https://b.com`, assert `getMaxRequestLineWidth` reflects the resolved pathname width

## 6. Regression and verification

- [x] 6.1 Manually run `httptui examples/basic.http` and confirm the request list still shows `GET /users`, `POST /users`, etc. (no regression for the non-variable case)
- [x] 6.2 Manually run `httptui examples/variables.http` and confirm the request list shows `GET /posts`, `POST /posts`, etc. (variables resolved)
- [x] 6.3 Manually run `httptui examples/variables.http --env <env file overriding baseUrl>` (use `staging-env.json` if it overrides `baseUrl`; otherwise craft a minimal env file) and confirm the list pathnames reflect the env override; press `E`, switch to `(none)`, confirm the list reverts without a reload
- [x] 6.4 Run `npm test` — all tests pass (547/547 across 41 files; +9 new tests, +3 new test files)
- [x] 6.5 Run `npm run lint` and `npm run build` once more after all test changes; confirm zero errors on changed files via `lsp_diagnostics` (14 lint errors are all pre-existing in untouched files: `certificates.ts`, `env-parser.ts`, `certificates.test.ts`, `config.test.ts`)