## Context

The app already has two pure "request → text" precedents to model on: `src/core/http-serializer.ts` (request → `.http` text, pure, no I/O) and `src/core/editor-launcher.ts` (spawn an external process, launcher injectable for tests). Variable resolution is a single reusable entry point (`resolveVariables(request, variables, baseDir)` in `src/core/variables.ts`), already called by both the send path and the details panel. All keyboard input flows through one `useInput` handler in `src/app.tsx`; transient feedback flows through `SET_TRANSIENT_MESSAGE` with a 2-second auto-clear.

The executor mutates the resolved request before sending in two ways the curl serializer must mirror: it strips `Content-Type` when form-data fields are present (undici generates the boundary), and it adds `Content-Type: application/json` when a non-form-data body starts with `{`/`[` (after `trimStart()`) and no Content-Type is set. TLS behavior lives outside the request object: `state.insecure` and `matchCertificate(url, state.certificates)` (see `src/app.tsx` `sendSelectedRequest`).

Prior art studied: VS Code REST Client resolves all variables before generating curl (secrets included, no redaction, no user complaints in ~7 years) and delegates generation to httpsnippet, whose output has accumulated real bug reports — literal `< file` body refs (#1243), lowercased header names (#1365), bash-only quoting breaking cmd (#558), `-X HEAD` hangs. This design deliberately avoids each.

## Goals / Non-Goals

**Goals:**

- A pure, testable serializer: resolved request (+ TLS context) → single-line bash-quoted curl string.
- A small native-clipboard module with an injectable spawner, testable without touching a real clipboard.
- Executor fidelity: the pasted command reproduces what `sendSelectedRequest` would send (headers, Content-Type defaulting, form-data handling, TLS).

**Non-Goals:**

- SSH/remote-session support (OSC 52) — native tools only, per user decision. Over SSH the native tool either doesn't exist or targets the remote machine; the feature reports failure honestly instead.
- Windows cmd / PowerShell quoting variants. Single bash-style output only.
- A raw/placeholder-preserving variant (future idea if requested).
- Proxy, redirect, or timeout flags (`-L`, `--max-time`, `-x`) — not part of the request's semantics.

## Decisions

### Decision 1: Two new core modules, mirroring existing siblings
- `src/core/curl-serializer.ts` — `toCurlCommand(resolvedRequest, options): string`. Pure: no I/O, no React/Ink imports, mirroring `http-serializer.ts`. `options` carries `insecure: boolean` and the matched certificate's file paths (not contents — curl wants paths, unlike undici which gets loaded buffers).
- `src/core/clipboard.ts` — `copyToClipboard(text): Promise<void>`, spawning the platform's native tool. The spawn function is a parameter with a real default (`(cmd, args, input) => Promise<void>` over `node:child_process`), mirroring `editor-launcher.ts`'s injectable `launch` — tests inject a fake; no real clipboard is touched.
- No new npm dependencies. `clipboardy` was rejected: doubles the dependency count (6 runtime deps today → 12), ships an `xsel` ELF plus Windows `.exe`s that tsup bundling drops anyway (its own `fs.existsSync` fallback acknowledges this), and offers nothing for SSH since it has no OSC 52 path.

### Decision 2: Operate on the resolved request, resolve in the handler
The `y` handler in `app.tsx` builds the same `resolveVariables(request, state.variables, dirname(state.filePath))` call as `sendSelectedRequest`, then runs `matchCertificate` on the resolved URL for TLS flags. The serializer receives a `ResolvedRequest` and never sees `ParsedRequest` UI fields (`name`, `lineNumber`, `isDirty`). Rationale: curl is an execution artifact; REST Client precedent and runnable-output semantics both point to resolved. The alternative (preserve `{{placeholders}}` like `save-as-http` does) serves round-trip fidelity, which is `.http` export's job — the two exports intentionally differ.

### Decision 3: Argument order and flags (pinned, observable output)
`curl [-I | -X METHOD] '<url>' [-H …]* [--form-string … | --data-raw …] [-k] [--cert …]`

- `GET` → no method flag (redundant; avoids the `-X GET` anti-pattern). `HEAD` → `-I` (`-X HEAD` makes curl await a body that never comes). Others → `-X <METHOD>`.
- Headers in original order, original casing (httpsnippet's lowercasing is open bug #1365 in REST Client). URL always quoted.
- Body → `--data-raw`, never `-d`/`--data`: `-d '@x'` reads a file; `--data-raw` sends `@x` literally (REST Client bug #1243 ships literal `< ./file.json` bodies). Body verbatim — no minification; embedded newlines stay inside the single quotes, which bash accepts, so "single line" means no backslash continuations rather than physically-one-line bytes.
- Form-data → `--form-string 'k=v'` per field; any `Content-Type` header is omitted regardless of value — the executor's `removeContentTypeHeader` is unconditional before send, and curl generates its own boundary exactly as undici does. Only text fields can occur (the Postman parser drops file-typed fields), so no `-F 'k=@file'` path is needed.
- Content-Type defaulting replicates the executor's rule (`trimStart().startsWith('{') || startsWith('[')`). Prefer extracting that predicate into a tiny shared helper used by both `executor.ts` and `curl-serializer.ts` over duplicating it, so the two cannot drift.
- TLS: `-k` when `state.insecure`; matched cert paths as `--cert/--key` (PEM), `--cert/--pass` (PFX), `--cacert` (CA). Paths come from the matched `CertEntry` directly — no file loading, unlike the send path.
- No `--max-time`/`-L`: the executor's 30s timeout and no-redirect behavior are client policy; curl's defaults (no timeout, no redirect-following) already match on redirects.

### Decision 4: Bash single-quote escaping, one variant
Every argument wrapped in `'…'`, embedded `'` escaped as `'\''`. Deterministic (always quote, unlike httpsnippet's safe-char whitelist) and trivially testable. Windows users can paste into WSL/Git Bash; producing cmd/PowerShell variants is out of scope (REST Client's bash-only quoting is open bug #558 — we match its scope, not fix it).

### Decision 5: Native clipboard chain, per platform
- macOS: `pbcopy` with `LC_CTYPE=UTF-8` (clipboardy's trick — pbcopy's encoding follows locale).
- Windows: PowerShell `Set-Clipboard` with the text transported as a base64 UTF-8 argument decoded inside the `-Command` script (`[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('…')) | Set-Clipboard`). Base64-in-arg, not stdin: `clip.exe` and naive stdin piping mangle non-ASCII through the console codepage; hermes-agent uses the same base64-arg pattern.
- Linux: `wl-copy` when `WAYLAND_DISPLAY` is set; else `xclip -selection clipboard`; else `xsel --clipboard --input`. Selection tries each in order and fails when all fail. (`xclip` has an stdout-hang bug; we don't read its stdout, so order stays xclip-then-xsel, matching fzf/Whale.)
- Input written to stdin without a trailing newline. Non-zero exit or spawn error (`ENOENT`) → try next; all exhausted → `ClipboardError` whose message names the tools to install (e.g. "install xclip or wl-clipboard").
- Windows/Linux detection via `process.platform` plus env vars only; no `is-wsl` dependency (WSL runs Linux binaries against the Wayland/X11-less clipboard — it will fail honestly, which is acceptable and matches the no-SSH decision).

### Decision 6: Handler wiring follows `performEditorHandoff`
An inline async `copySelectedAsCurl()` in `app.tsx` (no reducer action — nothing persists in state), a `y` branch in the normal-mode section of `useInput` near the `S`/`e`/`R` cluster, `SET_TRANSIENT_MESSAGE` on success and a transient error on failure. `y` is free in normal mode (only consumed by the confirm overlays, which gate on their own modes). Registry entry: `key: 'y'`, `label: ''`, `description: 'Copy request as curl'`, `showInBar: false` (status bar is budget-pinned at 6 entries), `showInHelp: true`, `group: 'request'`.

## Risks / Trade-offs

- [Resolved secrets land on the clipboard] → Accepted by decision and documented in the spec's scenarios; matches REST Client precedent (zero complaints in ~7 years). A future "share-safe" variant is the escape hatch if anyone asks.
- [Native-only clipboard: fails over SSH or on Linux without xclip/xsel] → Honest, actionable error naming installable tools. OSC 52 remains a pure add-on later (the serializer is unaffected; only `clipboard.ts` grows a fallback).
- [PowerShell startup latency (~0.5–2s) on Windows copy] → Acceptable for a keystroke-triggered action; the transient message appears after resolution regardless. Alternative (`clip.exe`) corrupts non-ASCII and was rejected.
- [Executor and serializer Content-Type logic drift] → Shared predicate helper (Decision 3); both call sites tested against the same scenario table.
- [`--data-raw` with embedded newlines pasted into non-bash shells breaks] → Documented bash-only scope; single-line-continuation-free output already maximizes paste robustness within that scope.
- [Large bodies produce very long single-line commands] → No size cap in v1; native clipboards handle megabytes on macOS/Linux, but the Windows base64-argument transport is bounded by the ~32,767-character CreateProcess command-line limit (base64 inflates text ~4/3, so commands past roughly 24 KB of source text fail, surfacing as the generic PowerShell-not-runnable error). Revisit only if a real complaint appears (OSC 52's ~48KB limit would matter only if OSC 52 is ever added).

## Migration Plan

Additive only — no existing behavior changes except the help overlay gaining one row. Rollback is deleting the two new modules, the `useInput` branch, and the registry entry. No data, config, or file-format migration involved.
