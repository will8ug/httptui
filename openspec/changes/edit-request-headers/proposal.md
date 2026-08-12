## Why

The in-session editor (`e`) can edit a request's URL and body, but not its headers. Headers are the one request dimension still locked to the source file: changing a header requires an external file edit and reload, breaking the in-session workflow the editor exists to provide.

## What Changes

- Add a third tab, `headers`, to the multi-tab request editor, between `url` and `body` in the tab strip.
- Seed the headers buffer from the request's `Record<string, string>` headers, serialized as one `Name: Value` line per header, preserving insertion order and `{{variable}}` placeholders verbatim.
- On commit, parse the buffer back into a `Record<string, string>`: split each line on the first `:`, trim the value's leading whitespace, resolve case-insensitive duplicate keys with last-wins (mirroring `parser.addHeader`), and skip blank lines.
- Reject the commit with a transient error, staying in edit mode, when any non-blank line lacks a `:` — no silent data loss.
- Commit an empty headers buffer as `{}` (unlike body, which commits as `undefined`).
- Extend `Shift+Tab` to cycle through all three tabs (`url` → `headers` → `body` → `url`), each buffer and cursor preserved across switches.
- Allow `Enter` to insert newlines in the headers tab (one header per line), matching body-tab behavior; the URL tab remains single-line.
- Include header changes in the commit's `changed` detection so `isDirty`/unsaved-changes markers fire and header edits flow through in-place save and save-as.
- Update the `e` shortcut description from "Edit request URL or body" to mention headers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `request-editing`: The multi-tab editor gains a `headers` target. Requirements covering edit-mode entry, raw-text display, newline handling, commit, cancel, overlay presentation, tab switching, and the single-line URL tab are all affected, plus a new requirement defining the headers buffer's serialization and commit-parsing contract.

## Impact

- `src/core/types.ts` — `EditTarget` widens from `'body' | 'url'` to include `'headers'`.
- `src/core/reducer.ts` — `ENTER_EDIT` seeds the headers buffer; `COMMIT_EDIT` parses it back into the request and folds header changes into `changed`/`isDirty`; the three `editBuffers` reset sites gain a `headers` entry; a new reject-and-stay path for malformed header lines.
- `src/app.tsx` — `e` dispatcher seeds the headers buffer; `Shift+Tab` cycle becomes three-way; `EditOverlay` tab strip gains `'headers'`.
- `src/core/shortcuts.ts` — `e` shortcut description updated.
- New header↔text conversion helper (split on first colon, trim, case-insensitive last-wins) — none exists today; `parser.addHeader` is the inverse contract to mirror.
- `src/core/in-place-save.ts` — guard against `###`-prefixed header lines, which would collide with the `.http` block separator.
