# Contributing to httptui

Before committing: `npm test`, `npm run lint`, and `npm run build` must all pass.

## ESLint disable comments

Prefer fixing code over suppressing rules. When suppression is correct, use a
**per-line** directive with a **justification** after `--`:

```ts
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for out-of-bounds access
if (!option) {
  return;
}
```

1. **One line, one rule, one reason.** `eslint-disable-next-line` naming the exact
   rule, then `--` and the specific runtime condition the type system can't prove
   (e.g. "Record lookup; key may not exist at runtime").
2. **Suppress only false positives.** Guards against out-of-bounds array/Record
   access are load-bearing — `noUncheckedIndexedAccess` is off, so the type system
   can't see them. Keep the guard, suppress the flag.
3. **Remove, don't suppress, true findings.** Dead variables, redundant type
   assertions, and unused imports are deleted, not disabled.
4. **No new file-level blanket disables.** The `/* eslint-disable ... */` headers
   in the JSON parsers (`openapi-parser.ts`, `postman-parser.ts`,
   `format-detector.ts`) are grandfathered; don't add new ones.
