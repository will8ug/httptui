## Context

The clipboard stack today is write-only: `src/core/clipboard.ts` exposes `copyToClipboard` with an injectable `ClipboardRunner` and per-platform candidate tools, and the `copy-as-curl` capability (`y` key, `src/core/curl-serializer.ts`) serializes a resolved request into a single-line bash command. The request model (`ParsedRequest`) has no append path — every `Action` replaces or edits requests in place, and `buildInPlaceContent` (`src/core/in-place-save.ts`) refuses outright when the in-memory request count exceeds the file's parsed count. Feedback channels are `transientMessage` (green) and `transientError` (red) rendered in `StatusBar.tsx`, auto-cleared on a text-change-reset timer in `app.tsx`. Postman/OpenAPI parsers warn via `process.stderr` because they run before the TUI starts; paste runs mid-session with Ink owning the screen, so stderr is not an option. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- A pure, I/O-free curl parser whose only contract is the spec's supported/convertible/skipped/refused partition, with `y`→`p` round-trip as the correctness anchor.
- Paste feedback entirely inside the TUI: green success, yellow summary warning, red specific refusal — no stderr writes from any code path that runs mid-session.
- Pasted requests persist through both existing save flows without corrupting the source file.

**Non-Goals:**

- Full shell emulation: no variable/tilde/glob expansion, no `$'…'` ANSI-C quoting, no command substitution. Exotic inputs land in refusal or literal handling.
- Enumerating every curl flag; the arity table covers common flags, and the unknown-flag policy degrades safely.
- Blank-canvas sessions, multi-request paste, per-flag warning detail (proposal non-goals).

## Decisions

### D1: Read-side clipboard mirrors the write side, with a separate runner type

`readFromClipboard(options)` in `src/core/clipboard.ts` reuses the candidate-loop pattern (`darwin`: `pbpaste` with `LC_CTYPE=UTF-8`; `win32`: `powershell -NoProfile -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-Clipboard -Raw"`; `linux`: `wl-paste` → `xclip -selection clipboard -o` → `xsel --clipboard --output`, Wayland-gated like the write side). The UTF-8 output-encoding pin is the read-side mirror of the write side's base64 transport: without it PowerShell recodes through the console codepage and corrupts non-ASCII.

The existing `ClipboardRunner` returns `Promise<void>`; a read must produce stdout text. Add `ClipboardReadRunner = (command, args, env?) => Promise<string>` rather than changing `ClipboardRunner` — the write signature is baked into existing tests and the copy-as-curl wiring; changing its return type buys nothing. `AppProps` gains `clipboardReadRunner?: ClipboardReadRunner` for test injection, mirroring `clipboardRunner`.

Trailing newlines from `wl-paste`/`xclip` are harmless: the tokenizer treats unquoted whitespace as a separator, and quoting in the copy-as-curl dialect keeps meaningful newlines inside quotes.

### D2: Parser is pure and returns a result object — no warnings from inside

`src/core/curl-parser.ts` exports `parseCurlCommand(text)` returning `{ ok: true; request: ParsedRequest; skipped: boolean } | { ok: false; error: string }`. Unlike the Postman/OpenAPI parsers it never writes to stderr: it runs mid-TUI, and the `skipped` boolean is all the caller needs to choose the yellow summary warning over the green success message. Refusal `error` strings are user-facing (the red message names the reason). Purity keeps it unit-testable and keeps presentation in `app.tsx`.

### D3: Hand-rolled tokenizer with explicit scope

A single-pass state machine over the raw text with three states (unquoted, single-quoted, double-quoted): backslash escapes the next character in unquoted and double-quoted contexts; inside single quotes every character is literal (matching bash, so `'\''` decodes correctly — which the copy-as-curl dialect relies on); backslash-newline is a line continuation (both characters dropped); unquoted whitespace (including newlines) separates tokens; `$` is literal everywhere — no expansion. `$'…'` ANSI-C quoting is not supported and falls out as ordinary single-quoting; acceptable divergence, documented here. Alternatives considered: a real shell parser dependency (overkill — the input dialects are Chrome DevTools, Postman, and our own serializer output) and `string.split` naively (breaks on every quoted space).

### D4: One flag table drives classification, arity, and defaults

The parser's core is a table mapping every known flag to arity and disposition:

| Flags | Arity | Disposition |
|---|---|---|
| `-X`, `--request` | 1 | method; uppercased; outside `HttpMethod` union → refuse naming the method |
| `-I`, `--head` | 0 | method `HEAD` |
| `-H`, `--header` | 1 | header split at first `:`; no `:` → warn-skip header |
| `-d`, `--data`, `--data-raw`, `--data-binary` | 1 | body; repeats concatenate with `&`; leading `@` → warn-skip flag |
| `-F`, `--form`, `--form-string` | 1 | form field `key=value`; `@`/`<` value prefix → warn-skip field, keep the rest |
| `--url` | 1 | URL |
| `-u`, `--user` | 1 | `user:pass` → `Authorization: Basic …`; no colon → warn-skip |
| `-b`, `--cookie` | 1 | string → `Cookie` header; `@`/`--cookie-jar`-style file refs → warn-skip |
| `--json` | 1 | JSON headers + body; `@file` → warn-skip |
| `-A`, `--user-agent`, `-e`, `--referer` | 1 | `User-Agent` / `Referer` header (≡ `-H`) |
| `-L`, `--location`, `-k`, `--insecure`, `--compressed`, `-G`, `--get`, `-s`, `-S`, `-v`, `--silent`, `--show-error`, `--verbose`, `#`, `--http1.1`, `--http2*`, `--http3`, `-4`, `-6` | 0 | warn-skip |
| `--proxy`, `-x`, `--cert`, `--key`, `--cacert`, `--pass`, `--cert-type`, `--key-type`, `-m`, `--max-time`, `--connect-timeout`, `--data-urlencode`, `-T`, `--upload-file`, `-o`, `--output`, `--retry`, `-c`, `--cookie-jar`, `--dump-header`, `-D` | 1 | warn-skip (arity consumed so the argument is not mistaken for a URL) |

Default method mirrors curl: `GET` unless data or form flags are present and no explicit method was given, then `POST`. Both data and form present → form wins, data flags warn-skipped. Repeated header names: last wins (`Record` semantics). Scheme-less URLs get `http://` prepended (curl behavior); a URL still unparseable by `new URL()` afterwards → refuse.

Unknown flags are treated as argument-less and warn-skipped. If that misclassification leaves a second positional token, the existing "more than one URL" refusal catches it — degrade to refusal, never to silent misparse.

### D5: Refusal gates run before any state change

In order: trimmed text empty → refuse; token stream contains `&&`, `||`, `;`, `|`, `--next`, or a second `curl` token → refuse "multiple commands"; first token not `curl` → refuse "not a curl command"; positional/`--url` URL count ≠ 1 → refuse (no URL / multiple URLs); method outside union → refuse naming it; URL unparseable → refuse. Nothing is dispatched until parse succeeds, so refusals leave the request list untouched.

### D6: New state channel `transientWarning`, three-way exclusivity

`AppState` gains `transientWarning: string | null`. New actions: `SET_TRANSIENT_WARNING { warning }` and `SET_TRANSIENT_ERROR { error }` (generic red setter — today `transientError` is only set by domain-specific actions; paste refusals and clipboard failures need a generic one). All three setters clear the other two channels; `CLEAR_TRANSIENT_MESSAGE` clears all three (name retained to avoid churning call sites; behavior broadened). The auto-clear effect in `app.tsx` watches the displayed transient text — message, warning, or error — on the same text-change-reset window as today. `StatusBar` renders the warning in yellow bold (the palette already uses yellow bold for `INSECURE`) and includes its length in the left-side width budget like message/error today.

Paste feedback copy (v1, fixed strings): success `Pasted request`; warning `Pasted request — some curl options were skipped`; refusals per D5 with reasons; clipboard failure carries `readFromClipboard`'s remedy message.

### D7: `APPEND_REQUEST` mirrors `SELECT_REQUEST` for selection mechanics

`{ type: 'APPEND_REQUEST'; request: ParsedRequest }` appends the request, sets `selectedIndex` to the new last index, clamps `requestScrollOffset` to bring it into view, resets `requestHorizontalOffset` and details offsets, and clears search state — exactly what `SELECT_REQUEST` does today (which leaves `response` untouched; mirroring keeps paste consistent with every other selection change). The request carries `isDirty: true` and `lineNumber: 0` as a "not from any file block" sentinel.

Name derivation: `new URL(url).pathname || '/'`, name = `` `${method} ${path}` ``. Duplicate names across repeated pastes are acceptable — nothing keys on name uniqueness.

### D8: In-place save learns to append instead of refusing

`buildInPlaceContent` refuses when `original.requests.length !== currentRequests.length`. New rule: a surplus is treated as appended requests — indices beyond the original count serialize (via `serializeRequestBlock`, `###`-separated, EOL-consistent) after the file's existing content; a deficit still refuses (genuine disk change). Since appended blocks go last and the function re-parses for fresh line numbers on every save, existing blocks never shift. `S` (save-as) already serializes the full request list, so pasted requests flow through it unchanged (verified in tasks).

### D9: Wiring follows the copy-as-curl handler shape

`app.tsx` gains a `pasteFromClipboard()` async handler next to `copySelectedAsCurl()`: read → parse → on success dispatch `APPEND_REQUEST` plus `SET_TRANSIENT_(WARNING|MESSAGE)`, on refusal dispatch `SET_TRANSIENT_ERROR`. The `p` key binds in the normal-mode branch beside `y`; mode-guarded branches already return earlier, and the help overlay guard at the top of `useInput` covers `p` for free. `SHORTCUTS` gains `{ key: 'p', group: 'request', showInBar: false, showInHelp: true, description: 'Paste curl command as request' }`; the help overlay and README table pick it up from the registry.

## Risks / Trade-offs

- [Tokenizer diverges from real shells on exotic quoting (`$'…'`, nested expansions)] → The guaranteed-correct dialect is our own serializer output plus common Chrome/Postman output, all covered by tests; exotic forms either tokenize literally or hit refusal — never a silent misparse.
- [Unknown-flag arity guessing consumes the wrong tokens] → Any mis-parse surfaces as a second positional URL → refusal; the arity table grows as real-world commands demand.
- [`-G` warn-skipped leaves data as a request body instead of curl's query-string move] → Known semantic drift, flagged by the warning; accepted for v1 alongside the other warn-and-skip flags.
- [In-place append assumes any surplus request is a paste] → The surplus serializes as a block, so the file always remains valid `.http`; worst case is an unexpected block after an external mutation, which the existing reload flow already handles.
- [Status bar width starvation when warning + env + insecure all show] → Warning text is short and transient; the existing truncation budget already accounts for adjacent segments.

## Migration Plan

Additive change; no data or config migration. Rollback is reverting the commit — no persisted state references pasted requests except saved `.http` content, which is forward-compatible.

## Open Questions

- None blocking. Whether the yellow warning should later carry per-flag detail is deferred (spec pins the v1 summary string; expanding it is a spec change).
