## 1. Fix

- [ ] 1.1 Add `height="100%"` to the inner `<Box flexGrow={1}>` in `src/components/Layout.tsx` line 34 that wraps the `{right}` content

## 2. Verification

- [ ] 2.1 Run `npm run build` and verify no type errors
- [ ] 2.2 Run `npm test` and verify all existing tests pass
- [ ] 2.3 Manually verify: with a large response (e.g., `GET /users` in `examples/basic.http`), the "Response" title and panel border are visible