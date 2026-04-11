# Future Optimizations

Ideas deferred from current work. Pick these up when the time is right.

---

## Use system CA certificates by default (Node.js 23.8+)

**Context**: httptui users behind corporate proxies or with locally-installed root CAs hit `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. The current fix (`--insecure` flag + better error messages) works but requires user action.

**Optimization**: Change the shebang from `#!/usr/bin/env node` to `#!/usr/bin/env -S node --use-system-ca`. This makes Node.js load CAs from the OS certificate store (macOS Keychain, Windows Certificate Store, Linux OpenSSL dirs) automatically — zero user friction.

**Where**: `tsup.config.ts` line 11, `banner.js` field.

**Blocked by**: Requires bumping `engines.node` from `>=18` to `>=23.8`. The `-S` flag in env shebang also needs GNU coreutils (works on macOS/Linux, not all minimal Docker images).

**When to revisit**: When Node.js 18 and 20 reach EOL, or when the user base is predominantly on Node 23.8+.
