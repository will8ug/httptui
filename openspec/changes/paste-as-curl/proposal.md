## Why

curl commands are the lingua franca of HTTP debugging — Chrome DevTools, Postman, and colleagues' terminals all produce them — but httptui can only *export* requests as curl (`y`), never import them. Today, recreating a copied curl command means hand-transcribing its URL, headers, and body into a `.http` file. Supporting the inverse direction (`p`) closes the loop and makes the clipboard a first-class import source, with the same warn-and-continue semantics users get from Postman collection imports.

## What Changes

- New `p` keybinding in normal mode: reads a curl command from the system clipboard, parses it, and appends it as a new request at the end of the request list.
- New read-side clipboard support (today `src/core/clipboard.ts` is write-only): `pbpaste` on macOS, PowerShell `Get-Clipboard` on Windows, `wl-paste`/`xclip -o`/`xsel -o` on Linux, mirroring the write-side platform candidates.
- New pure curl parser (`src/core/curl-parser.ts`) covering a well-defined curl subset:
  - **Supported natively**: positional URL, `-X`/`--request`, `-I`/`--head`, `-H`/`--header`, `-d`/`--data`/`--data-raw`/`--data-binary` (string form), `-F`/`--form`/`--form-string` (text fields), `--url`, line continuations, single/double/unquoted shell tokenization.
  - **Converted silently** (fully representable as headers/body): `-u user:pass` → `Authorization: Basic …` header, `-b cookies` (string form) → `Cookie` header, `--json 'body'` → JSON headers + body.
  - **Warned and skipped, parsing continues**: everything else (`-L`, `-k`, `--proxy`, `-G`, `--data-urlencode`, `-T`, `--compressed`, TLS cert flags, `@file` body/cookie references, `-F` file fields, cosmetic flags like `-s`/`-v`, unknown flags).
- Unsupported curl capabilities produce a warning and the rest of the command is still imported, mirroring Postman import semantics — but surfaced in the TUI as a new **transient warning** (yellow, status bar, auto-clearing) instead of stderr writes, which would garble the rendered Ink frame mid-session.
- Refusals (nothing pasted, red transient error): clipboard content that is not a single curl command (multiple commands, `&&`/`;`/`|`/`--next` chains, non-curl text), a curl command with no URL, an unsupported HTTP method (outside the `HttpMethod` union), or an unreadable clipboard.
- Pasted requests are appended after the last request, marked dirty, named after `METHOD /url-path`, and persist through the existing save flows (`S` save-as; in-place save appends them).
- Round-trip invariant: pasting the output of `y` (copy-as-curl) reproduces an equivalent request.

Non-goals for this change:

- Blank-canvas mode (running `httptui` with no file argument) — the CLI still requires a file.
- Multi-request paste (`curl … && curl …`, `--next`, comma-joined URLs) — refused outright rather than partially imported.
- Per-flag warning detail — v1 shows only a summary warning (`Pasted request — some curl options were skipped`); no list of skipped flags.
- File-based curl features (`@file` bodies, `--upload-file`, cookie jars) — warned and skipped, never read from disk.

## Capabilities

### New Capabilities
- `paste-as-curl`: Import a single curl command from the system clipboard as a new request via the `p` key — clipboard read, curl parsing with silent conversions for representable flags, warn-and-skip for unsupported flags, refusal for unparseable or multi-command input, append-at-end placement, name derivation, dirty marking, and round-trip fidelity with copy-as-curl.

### Modified Capabilities
- `status-bar`: New requirement for a transient warning message rendered in yellow bold alongside the existing green transient message and red transient error, auto-clearing on the same 2-second mechanism and mutually exclusive with them.

## Impact

- **New module** `src/core/curl-parser.ts` (pure, no I/O) + `test/core/curl-parser.test.ts`.
- **Extended** `src/core/clipboard.ts` with a read path (`readFromClipboard`) and read-side platform candidates; `ClipboardRunner` signature gains stdout capture (write path unaffected).
- **State**: `AppState` gains `transientWarning`; `Action` gains `SET_TRANSIENT_WARNING` and `APPEND_REQUEST`; reducer handles both.
- **UI**: `StatusBar.tsx` renders the yellow warning; `app.tsx` binds `p` and wires read → parse → dispatch; `shortcuts.ts` registers the shortcut (help overlay picks it up automatically).
- **Persistence**: pasted requests must survive `S` and in-place save; `in-place-save`/`http-serializer` handling of a non-file-origin request is verified/extended so it appends rather than corrupts the file.
- **Docs**: README shortcuts table gains `p`.
