# Proposal: fix-wide-char-width

## Why

Response bodies containing multilingual text (CJK, emoji) break the TUI layout: toggling wrap mode (`w`) on a long wide-character line renders borders and chrome at wrong positions or drops them entirely. The root cause is that every width decision in the response pipeline measures text in UTF-16 code units (`.length`, `.slice()`), while terminals render in display cells (CJK = 2 cells, emoji clusters = 2 cells). A line budgeted at N code units can occupy up to 2N cells; in wrap mode the over-wide lines are rendered verbatim (`{ kind: 'pass' }`, no truncation backstop), Ink re-wraps them at the panel's true width, every affected row multiplies, and the fixed-height panel overflows — corrupting the chrome. The nowrap path (truncation, horizontal shift, scroll clamps) shares the same code-unit bug class across all panels.

## What Changes

- Add a shared display-cell width primitive (`string-width@^8` — the same major version Ink 7.1 uses internally, so the dependency tree dedupes to one width implementation) with grapheme-aware slicing helpers that never split a wide character or grapheme cluster at a boundary.
- Rewrite `wrapLine` / `wrapColorizedSegments` (`src/utils/wrap.ts`) to budget in display cells: wrapped visual lines never exceed `contentWidth` cells; break points prefer word boundaries, else grapheme boundaries; wide characters that straddle the boundary move to the next line intact.
- Rewrite the nowrap path in `src/utils/text.ts` (`truncateText`, `shiftText`, `expandTabs`) to budget in display cells: truncation ellipsis lands at the true cell boundary; horizontal offsets shift by display cells and snap to grapheme boundaries; tab stops advance by cells.
- Compute max-line-width scroll clamps (`getMaxResponseLineWidth` and siblings in `src/utils/scroll.ts`) in display cells so horizontal scrolling clamps correctly for wide-character content.
- Add a defensive render-time clamp in the response pipeline so no visual line — including search-marked lines — can ever emit more cells than the panel's content width, even if a future width bug regresses.
- ASCII-only behavior is unchanged: display-cell width equals code-unit count for ASCII, so all existing ASCII expectations (tests included) keep passing.

## Capabilities

### New Capabilities
- `display-width`: Terminal display-cell semantics for all text measurement and slicing — width is counted in cells, wide characters and grapheme clusters are never split at boundaries, and rendered lines never exceed their panel's content width.

### Modified Capabilities
- `text-wrap`: Wrap-mode line construction changes from "`contentWidth` character boundaries" to display-cell boundaries, with wide-character and grapheme-cluster break behavior specified.
- `navigation`: Horizontal scrolling semantics change from "substring starting from `horizontalOffset` characters" to slicing by display cells, so offsets correspond to visual columns for wide-character content.

(`request-details` already specifies horizontal offsets as "one visual column in the terminal" — this change makes the implementation comply; no requirement change needed. `shortcuts` and `request-editing` reference truncation observably and need no requirement change.)

## Impact

- **Dependencies**: add `string-width@^8` (runtime). Version-matched to Ink's internal `string-width@^8.2.0` to keep a single width implementation in the tree.
- **Code**: `src/utils/wrap.ts`, `src/utils/text.ts`, `src/utils/scroll.ts`, `src/core/response-layout.ts` (separator consumption unchanged — box-drawing chars are single-cell), `src/components/ResponseView.tsx` (render clamp, search-marker cell accounting). Consumers (`RequestList`, `RequestDetailsView`, `StatusBar`, `EditOverlay`, navigation reducers, editor visual-column math) pick up corrected behavior via the shared utilities without direct edits, except where tests assert updated semantics.
- **Behavior**: horizontal-scroll offsets are now measured in display cells (previously UTF-16 units) — for ASCII content the two coincide; for CJK content scrolling now reveals content that was previously skipped or over-scrolled. Truncation of wide-character lines shows more content per line than before (correct budget) and never splits a character.
- **Out of scope**: per-line wrap-width adjustment for the search-match marker column is fixed by the render clamp; no other search behavior changes.
- **Known limitation**: Indic/complex-script syllables (Tamil, Devanagari) are measured additively per `string-width` — correct on per-code-point terminals (Apple Terminal, xterm, GNOME/VTE, iTerm2), conservative (early wrap) on grapheme-clustering terminals (kitty, WezTerm, alacritty, foot). Per-terminal width correction, and terminals that lack complex-text shaping (matras render detached), are out of scope; see design Decision 8.
