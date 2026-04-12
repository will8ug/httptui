## Context

The `SHORTCUTS` array in `src/core/shortcuts.ts` defines the Escape key with the description `"Close overlay / cancel file load"`. This description combines two actions into one phrase, which is inconsistent with other shortcut descriptions that describe a single action. Additionally, the `HelpOverlay` component contains a hardcoded hint string `"Press Escape or ? to close"` that doesn't fully align with the new wording.

## Goals / Non-Goals

**Goals:**
- Rephrase the Escape shortcut description to `"Close current overlay"` for clarity and consistency
- Update all related UI text and spec documentation to match

**Non-Goals:**
- Changing Escape key behavior (it already closes overlays and cancels file load)
- Refactoring the shortcuts data structure
- Adding new keyboard shortcuts

## Decisions

1. **Description wording**: `"Close current overlay"` over alternatives like `"Close overlay"` or `"Dismiss overlay"`. The word "current" is important because it contextualizes which overlay is being closed — the one the user is looking at. This matches the Escape key's universal behavior of closing the topmost/active overlay.

2. **Help overlay hint**: Update from `"Press Escape or ? to close"` to `"Press Escape or ? to close this overlay"` to maintain consistency with the "current" wording and be more specific.

3. **No description split**: Keep a single description rather than context-dependent descriptions per overlay type. Escape always closes the current overlay regardless of type, so one description suffices.

## Risks / Trade-offs

- **Loss of "cancel file load" mention** → Risk: users may not realize Escape cancels file-load mode. Mitigation: the file-load overlay already has its own hint line `"Enter to load, Esc to cancel"`, so the cancel behavior is still discoverable within that specific context.