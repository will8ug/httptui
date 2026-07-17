## 1. ResponseView Tests

- [ ] 1.1 Create `test/components/ResponseView.test.tsx` following the established pattern: imports from `vitest`, `cleanup`/`render` from `ink-testing-library`, `ResponseView` from `../../src/components/ResponseView`, `createMockResponse`/`longResponse`/`compactJsonResponse` from `../helpers/responses`, and `afterEach(() => { cleanup(); })`. Define a shared base-props object (all 17 props with sensible defaults: `response: null`, `error: null`, `isLoading: false`, `verbose: false`, `focused: true`, `scrollOffset: 0`, `horizontalOffset: 0`, `wrapMode: 'nowrap'`, `rawMode: false`, a small explicit `availableHeight`, empty search state) and spread-override per test.
- [ ] 1.2 Add a `content states` describe block: loading renders the `Sending request` spinner label (assert label text only, never frame equality); error renders the error message and code; empty state renders `Press Enter to send a request`.
- [ ] 1.3 Add a `display modes` describe block: `compactJsonResponse` with `rawMode: false` renders multi-line indented JSON; with `rawMode: true` renders the raw single-line body; `verbose: true` with a response carrying headers renders the header lines.
- [ ] 1.4 Add a `scroll and overflow` describe block: multi-line response with non-zero `scrollOffset` and small `availableHeight` shows only the visible slice; `wrapMode: 'nowrap'` with `horizontalOffset > 0` hides leading characters; `nowrap` with pinned `contentWidthOverride` truncates long lines; `wrapMode: 'wrap'` continues long content on subsequent visual lines instead of truncating. Use `longResponse` or explicit body strings with counted lengths.
- [ ] 1.5 Add a `search markers` describe block: with `searchMatches` and `currentMatchIndex` set, the current match's visual line carries `►`; with multiple matches, non-current match lines in the visible slice carry `·`.
- [ ] 1.6 Add a `search bar` describe block: `isSearchMode: true` with a `searchQuery` shows `/` + query; `isSearchMode: false` with `lastSearchQuery` and non-empty `searchMatches` shows the position indicator (e.g. `[1/3]`); `lastSearchQuery` with empty `searchMatches` shows the no-matches indication.
- [ ] 1.7 Run `npx vitest run test/components/ResponseView.test.tsx` and confirm all tests pass.

## 2. RequestDetailsView Tests

- [ ] 2.1 Create `test/components/RequestDetailsView.test.tsx` following the same pattern, importing `RequestDetailsView` and `createRequest` from `../helpers/requests`. Define shared base props (`variables: []`, a small explicit `maxHeight`, `focused: true`, `scrollOffset: 0`, `horizontalOffset: 0`).
- [ ] 2.2 Add a `content` describe block: frame contains the `Request Details` title, method, and URL; a `{{baseUrl}}` URL with matching `variables` renders the resolved value and not the placeholder; headers render as `name: value` lines; `formdataFields` render as field lines; a body renders its content.
- [ ] 2.3 Add an `empty sections` test: a request with no headers and no body renders the request line without header or body lines.
- [ ] 2.4 Add a `scroll and overflow` describe block: long URL or body with pinned `contentWidthOverride` truncates at the content width; `horizontalOffset > 0` shifts shiftable lines; content exceeding `maxHeight` with non-zero `scrollOffset` shows only the visible slice.
- [ ] 2.5 Run `npx vitest run test/components/RequestDetailsView.test.tsx` and confirm all tests pass.

## 3. StatusBar Tests

- [ ] 3.1 Create `test/components/StatusBar.test.tsx` following the same pattern, importing `StatusBar`. Define shared base props (`filePath: 'test.http'`, `requestCount: 3`, `selectedIndex: 0`, `insecure: false`, `transientMessage: null`, `focusedPanel: 'requests'`, zeroed scroll offsets, representative total lines, `hasResponse: false`, `envName: null`).
- [ ] 3.2 Add a `shortcut bar and status text` describe block: frame contains `[Enter] Send`; `focusedPanel: 'requests'` shows `1/3`; `focusedPanel: 'details'` shows the scroll position over `detailsTotalLines`; `focusedPanel: 'response'` with `hasResponse: true` shows the scroll position over `responseTotalLines`; `focusedPanel: 'response'` with `hasResponse: false` shows the file name with no line-position indicator.
- [ ] 3.3 Add an `indicators` describe block: non-null `transientMessage` renders its text and `null` does not; non-null `envName` renders the name; `insecure: true` renders `INSECURE` and `false` does not.
- [ ] 3.4 Run `npx vitest run test/components/StatusBar.test.tsx` and confirm all tests pass.

## 4. Verification

- [ ] 4.1 Run `npm test` and confirm the full suite passes (all pre-existing tests plus the new component tests) with zero failures.
- [ ] 4.2 Run `npm run lint` and confirm no errors or warnings in the new test files.
- [ ] 4.3 Run `git status --short` and confirm no `src/**` files were modified — the change is test-only.
