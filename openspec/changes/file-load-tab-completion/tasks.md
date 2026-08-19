# Tasks

## 1. Pure completion logic

- [ ] 1.1 Create `src/utils/path-completion.ts` exporting `completePath(buffer, listDir)` per design.md Decision 1: split text-before-cursor at the last `/`, prefix-filter the listing (dotfiles excluded unless the partial starts with `.`), and implement the zero/one/many-match semantics returning `{ text, cursor, candidates }` with directory names carrying a trailing `/` in `candidates`
- [ ] 1.2 Add `test/utils/path-completion.test.ts` covering every scenario in the `file-load` spec delta using an injected fake `listDir`, including longest-common-prefix extension, no-progress listing, silent no-op on zero matches, dotfile rules, and mid-cursor completion

## 2. Candidate-list state

- [ ] 2.1 Add `fileLoadCompletions: string[] | null` to the state in `src/core/types.ts` and a `SET_FILE_LOAD_COMPLETIONS` action
- [ ] 2.2 In `src/core/reducer.ts`, clear `fileLoadCompletions` in the `UPDATE_FILE_LOAD_INPUT` and `MOVE_FILE_LOAD_CURSOR` cases, and reset it alongside the other `fileLoad*` fields in the enter/cancel/load cases

## 3. Tab key handling

- [ ] 3.1 Add a `key.tab` branch to the `fileLoad` section of `src/app.tsx`: resolve the directory part against the process cwd, read it with `readdirSync` (treating an unreadable directory as zero matches), call `completePath`, and dispatch `UPDATE_FILE_LOAD_INPUT` plus `SET_FILE_LOAD_COMPLETIONS` from the result
- [ ] 3.2 Pass `fileLoadCompletions` into the `FileLoadOverlay` render

## 4. Overlay rendering

- [ ] 4.1 Render the candidate list in `FileLoadOverlay` as a single dim row directly beneath the path input, clipped to the overlay width with a hidden-entry count when overflowing
- [ ] 4.2 Update the hint line to mention Tab completion
- [ ] 4.3 Extend `test/components/FileLoadOverlay.test.tsx` for the candidate row (rendered, clipped with count, absent when there are no candidates) and the new hint line

## 5. Verification

- [ ] 5.1 Add integration coverage for the Tab flow in `fileLoad` mode (single match, common-prefix extension, list display, list cleared on typing) using the existing test helpers
- [ ] 5.2 Run the project's lint, typecheck, and full test suite; confirm coverage thresholds still pass
