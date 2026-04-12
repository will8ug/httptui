## 1. Fix the parser regex

- [x] 1.1 Update the `parseRequestLine` regex in `src/core/parser.ts` to allow `{{...}}` expressions with spaces in the URL portion, changing `(\S+)` to `(?:\{\{[^}]*\}\}|[^\s])+`

## 2. Verify the fix

- [x] 2.1 Verify that `examples/variables.http` now parses all 3 requests correctly (previously only 2 were parsed)

## 3. Update parser spec

- [x] 3.1 Update the parser spec in `openspec/specs/parser/spec.md` if it references the `parseRequestLine` regex format