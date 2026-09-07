## 1. Dependency and primitives

- [ ] 1.1 Add `string-width@^8` to `package.json` dependencies, run install, and verify `npm ls string-width` resolves to exactly one copy (shared with ink's internal `^8.2.0`)
- [ ] 1.2 Implement `cellWidth`, `sliceByCells`, `sliceFromCells`, `clampSegmentsToWidth` in `src/utils/text.ts` per design Decision 2, and verify new unit tests in `test/utils/text.test.ts` pass: CJK budgeting (2 cells/char), emoji ZWJ family and flag clusters kept whole, round-down at straddling boundaries, empty/zero-width inputs
- [ ] 1.3 Verify ASCII identity: `cellWidth`/`sliceByCells`/`sliceFromCells` outputs match `.length`/`.slice` semantics for ASCII strings (unit tests with ASCII fixtures)

## 2. Wrap path

- [ ] 2.1 Rewrite `wrapLine` in `src/utils/wrap.ts` to budget in display cells per design Decision 3 pseudocode, and verify: existing ASCII wrap tests pass unchanged; new tests wrap `wrapLine('日本語…', N)` within N cells, move a straddling wide char to the next line, and break long spaceless CJK at grapheme boundaries
- [ ] 2.2 Verify `wrapColorizedSegments` against the rewritten `wrapLine` (structure unchanged per design Decision 4): existing color-preservation tests pass; new tests split colorized CJK/emoji lines at cell boundaries with colors preserved and no cluster split mid-segment

## 3. Nowrap path

- [ ] 3.1 Rewrite `truncateText` and `shiftText` per design Decision 5, and verify: existing ASCII truncation tests pass unchanged; new tests place `…` at the true cell boundary, exclude a straddling wide char, and snap `shiftText` offsets to grapheme boundaries
- [ ] 3.2 Convert `expandTabs` tab-stop tracking to cells (`cellWidth(result)`), and verify tab stops land on visual columns for lines containing CJK (unit test: tab after wide chars pads to the next multiple of `tabWidth` cells)
- [ ] 3.3 Convert `getMaxResponseLineWidth`, `getMaxRequestLineWidth`, `getMaxDetailsLineWidth` in `src/utils/scroll.ts` to `cellWidth`, and verify with a CJK fixture that `max(0, maxLineWidth - contentWidth)` yields the correct scroll clamp (unit tests)

## 4. Render guard

- [ ] 4.1 Apply `clampSegmentsToWidth` in `renderVisualLine` (`src/components/ResponseView.tsx`) with `contentWidth` budget, and `contentWidth - 1` for search-marked rows (marker glyph cell), per design Decision 7; verify with a component test that an over-wide CJK visual line renders clamped and the panel border stays intact
- [ ] 4.2 Verify no clamp behavior change for correctly-wrapped ASCII lines (existing ResponseView component tests pass unchanged)

## 5. Integration and regression

- [ ] 5.1 Update any existing tests that assert unit-based widths/offsets on non-ASCII fixtures to cell-based expectations; do not modify ASCII assertions
- [ ] 5.2 Run `npm run typecheck`, `npm run lint`, `npm test` and verify all pass
- [ ] 5.3 Manual verification in the TUI: load a response with a long single-line multilingual JSON body; toggle `w` (wrap) and confirm borders/status bar stay in place; scroll `h`/`l` and jump `$`/`0` in nowrap and confirm slicing lands on whole characters; search `/` a CJK substring and confirm marked lines stay within bounds
