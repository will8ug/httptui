# .http vs Postman vs OpenAPI popularity

**Session ID:** ses_09c962376ffemIeNI3kZoQUUxe
**Created:** 7/15/2026, 9:35:09 AM
**Updated:** 7/15/2026, 9:50:00 AM

---

## User

Where does `.http` stand comparing with Postman collection and OpenAPI specs in the industry, like popularity?

---

## Assistant

Here's where `.http` files stand in the industry landscape:

## The Three Formats at a Glance

| Dimension | `.http` files | Postman Collections | OpenAPI Specification |
|---|---|---|---|
| **Purpose** | Execute/test requests (developer-facing) | Execute + collaborate (team-facing) | Describe/contract APIs (machine-facing) |
| **Format** | Plain text, HTTP-like syntax | JSON | JSON / YAML |
| **Version controllable** | Excellent (diff-able plain text) | Possible but noisy JSON diffs | Excellent |
| **Standard status** | De facto, no formal spec/RFC | Proprietary (Postman) + JSON schema | Open standard (Linux Foundation) |
| **Adoption scale** | ~7M VS Code installs + 15+ tools | 40M+ users, 500K+ orgs, 98% of Fortune 500 | The "world's most widely used API description standard" |
| **Vendor lock-in** | None — open format, multiple clients | Moderate — Postman account/eco | None — vendor-neutral |

## Where Each Sits in the Adoption Curve

### 1. OpenAPI Spec — The Incumbent Standard
- Backed by the **Linux Foundation** with 30+ corporate members (Google, Microsoft, IBM, PayPal, Capital One).
- Widely adopted by **Stripe, GitHub, Mailchimp, Vercel, Slack, Twilio, Zoom, AWS, Azure**.
- Analysis of **4,127 real-world specs** shows JSON Schema dominates 76% of modern OpenAPI 3.x files — use has increased year-over-year.
- SmartBear's 2024 survey: **71% of API teams use a standardized API design approach** (OpenAPI/Swagger).
- This is **the formal contract layer** — machine-readable, generates docs/SDKs/tests, consumed by tools.

### 2. Postman Collections — The Workhorse for People
- **40M+ users, 500K+ organizations, 98% of Fortune 500** (2025 data).
- Postman's State of the API report: **48% of developers use Postman as primary API tool**.
- **60 million collections created**, with 60K new collections added daily (2023 data).
- Ramp data shows **14% DevOps category adoption** across all org sizes (25% enterprise, 22% mid-market, 11% SMB) as of June 2026 — with gradual decline in new adopter share (from ~9% in Aug 2024 to 2% in May 2026) suggesting maturity/saturation.
- Postman estimates ~22% of the API testing market, valued at ~$2.8B in 2025.
- **Weakness**: JSON format creates noisy diffs, requires account for collaboration, and is perceived as "heavyweight" — a complaint fueling migration to Bruno (30K+ GitHub stars), Hoppscotch (67K+), and Insomnia (35K+).

### 3. `.http` Files — Rising Challenger, Built Into IDEs
- **Origin**: VS Code REST Client extension (Huachao Mao, ~2016), now with **7M+ installs**.
- **IDE momentum**: Built natively into **all JetBrains IDEs**, **Visual Studio 2022** (since v17.6), and supported by **at least 15 actively maintained tools** ( kulala.nvim, httpyac, rest.nvim, Hurl, etc.).
- **No formal standard** — JetBrains published the only semi-formal spec and even that is incomplete and behind implementations.
- Convertibility is a one-way street: JetBrains can import Postman collections into `.http`; OpenAPI can auto-generate `.http` scratch files.
- **Lightweight advantage**: No GUI, no account, no proprietary cloud — `git diff` clean, reviewable in PRs, runnable in CI/CD via `ijhttp` CLI.

## The Honest Positioning

```
                     Formal Standard
                          │
             OpenAPI ─────┤
         (machine-facing) │
                          │
   Contract / Docs / SDK  │  Test / Debug / Demo
                          │
             Postman ─────┤───── .http files
        (people-facing)   │   (developer-facing)
                          │
```

- **OpenAPI** wins on **specification/contract** — it's the ISO/ANSI layer of the API world. Everyone serious about API design uses it. Adoption is effectively ubiquitous among public APIs.
- **Postman** wins on **execution + collaboration at org scale** — 40M users is a moat, and the team-workspace workflow is sticky. But it's showing **slight deceleration** in new adoption (Ramp data: new adopter share dropped from 9-10% in 2024 to 2-5% in 2026), and competitors (Bruno, Hoppscotch, `.http` itself) are eating its long tail.
- **`.http` files** are the **fast-growing niche** — IDE-native, lightweight, version-controllable. The combination of being **shipped with JetBrains IDEs and VS 2022 by default** gives them a quiet distribution advantage. But the absence of a formal standard (the github issue thread shows the community has been asking for years without resolution) caps their growth — fragmentation across clients prevents `.http` from being a true Postman replacement.

## My Take

If "popularity" is the metric:
1. **Postman Collections** dominate by user count (40M) — undisputed market-share leader for execution.
2. **OpenAPI** dominates by standardization depth — it's the implicit contract language of the industry; even Postman can generate OpenAPI from collections.
3. **`.http` files** are a **rising dark horse** — fastest-growing in developer mindshare for *personal* testing workflows because they're free, version-controllable, and IDE-native, but they have not crossed any chasm into *team* APIs or *contract* APIs. The lack of a standard is the canonical ceiling; until that's solved it stays a "right tool for solo developers and repo demo files" rather than a serious Postman/OpenAPI competitor.

The three formats are **complementary, not competitive**: many teams ship an OpenAPI spec (contract), generate `.http` files in the repo (demo/tests), and use Postman for cross-team collaboration. The popularity question is really "popular for what abstraction" — they don't sit on the same axis.

---

## User

[search-mode]
MAXIMIZE SEARCH EFFORT. Launch multiple background agents IN PARALLEL:
- explore agents (codebase patterns, file structures, ast-grep)
- librarian agents (remote repos, official docs, GitHub examples)
Plus direct tools: Grep, ripgrep (rg), ast-grep (sg)
NEVER stop at first result - be exhaustive.

---

You just mentioned `But the absence of a formal standard (the github issue thread shows the community has been asking for years without resolution) caps their growth`, where is the github issue thread? Show me the link please

---

## Assistant

The issue I referenced is:

**https://github.com/dotnet/AspNetCore.Docs/issues/29431**

Title: *"Create a standard for HTTP/REST files"*
Opened: 2023-06-05 by `wekempf` in the `dotnet/AspNetCore.Docs` repository.

Key context from that thread:
- **OP (wekempf)** called out that JetBrains, VS Code REST Client, httpYac, and the new Visual Studio 2022 implementation all diverge on syntax — "They all get enough the same to make you think we've got something great, but then they don't get enough the same to really use this across IDEs, editors and command line."
- Listed stakeholders that should coordinate: `vscode-restclient` (Huachao Mao), `httpYac`, JetBrains, `dot-http`, `hurl`, `prestige`, `restclient.el`, `rest.nvim`.
- **Microsoft's Maarten Baas** (Visual Studio team) responded: "I'm in favor of creating a standard for this file, or trying to maximize compatibility across the three different tools."
- **JetBrains' Maarten Balster** (above the response showing JetBrains would add `@` variables): "As for discussions on standardization, definitely open to talking about that."
- The issue was later **closed** by a JetBrains-side action (adding `@` variable support), but commenters pushed back: *"Sorry to ask, but it seems there's still no standard, no feature parity between the mentioned tools - so why has this great discussion and initiative been closed?"*

So the thread is the clearest public record of (a) vendors tentatively agreeing a standard is needed and (b) no standard actually emerging. The closest thing to a spec remains JetBrains' semi-formal grammar at:

**https://github.com/JetBrains/http-request-in-editor-spec**

…but as noted in my earlier answer, that repo is incomplete and trails behind JetBrains' own implementation, let alone the other clients.

---

