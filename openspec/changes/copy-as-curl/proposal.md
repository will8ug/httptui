## Why

httptui can send a request, inspect it, and export it back to `.http` — but it cannot hand the request to anything outside itself. The standard escape hatch in every REST client (VS Code REST Client, Postman, Chrome DevTools) is "copy as curl": a runnable, pasteable command for debugging, sharing in issues, replaying in CI, or handing to a teammate. httptui's `.http` export preserves variables and therefore is not runnable outside the project; a curl command is.

## What Changes

- New `y` (yank) keybinding in normal mode that copies the currently selected request as a single-line, bash-quoted `curl` command to the system clipboard.
- The copied command reflects the **fully resolved** request (all `{{variable}}` substitutions applied, same `resolveVariables()` path as sending) **plus the executor's implicit mutations** (auto `Content-Type: application/json` detection), so the command reproduces what httptui would actually send.
- Insecure mode (`--insecure`/`-k`) is reflected as curl's `-k` flag; a matched per-host client certificate is reflected as `--cert`/`--key` (PEM) or `--cert`/`--pass` (PFX) so mTLS requests still succeed.
- Form-data bodies (Postman `formdataFields`) serialize as `--form-string` flags — a representation the `.http` serializer cannot express, so curl export is strictly more faithful for these requests.
- Clipboard writes use platform-native tools only (`pbcopy`, PowerShell `Set-Clipboard`, `wl-copy`, `xclip`, `xsel`) — no OSC 52, no new dependencies. Failure surfaces as an actionable transient error (e.g. which tool to install).
- Resolved secrets (`{{$dotenv}}`, `{{$processEnv}}` values) land on the clipboard by design — matching VS Code REST Client's established behavior. This is documented, not engineered around.
- Success/failure feedback via the existing transient message mechanism; the new shortcut appears in the help overlay (`request` group) but not the status bar.

## Capabilities

### New Capabilities

- `copy-as-curl`: Copy the selected request as a runnable curl command to the system clipboard — serialization rules (method flags, headers, body, form-data, TLS options, quoting, single-line shape), clipboard delivery via native tools, and feedback on success/failure.

### Modified Capabilities

- `shortcuts`: New registry entry for the `y` key (`Copy request as curl`, help-only, `request` group), following the existing per-key requirement pattern.

## Impact

- **New code**: `src/core/curl-serializer.ts` (pure serialization, sibling of `http-serializer.ts`), `src/core/clipboard.ts` (native clipboard spawn with injectable runner, sibling of `editor-launcher.ts`).
- **Modified code**: `src/app.tsx` (normal-mode `y` branch + inline async handler), `src/core/shortcuts.ts` (registry entry), README shortcuts table.
- **No new dependencies**: clipboard access is hand-rolled over `node:child_process` (~100 lines), consistent with the existing `editor-launcher.ts` spawn pattern. `clipboardy` was evaluated and rejected (doubles dependency count, ships binaries that tsup bundling drops, no OSC 52 path — though OSC 52 is out of scope here anyway).
- **Out of scope**: SSH/remote sessions (native tools only — user decision), OSC 52, Windows-cmd/PowerShell quoting variants (bash-style quoting only), a raw/placeholder-preserving variant (future idea if ever requested).
- **Known accepted risk**: resolved secret values (bearer tokens, API keys) are placed on the system clipboard. Prior art (VS Code REST Client, ~7 years, zero filed complaints) indicates this matches user expectations for this feature.
