## Context

The `ResponseView` component (`src/components/ResponseView.tsx`) renders response content in a vertical flex column: title → content → search bar. The outer `<Box>` has `flexDirection="column"`, `height="100%"`, and no `justifyContent` property. This means the search bar flows directly after the last content line — when content is shorter than the panel, the search bar sits mid-panel instead of at the bottom edge.

The `visibleHeight` calculation already accounts for the search bar by subtracting `searchBarHeight` from `availableHeight - RESPONSE_PANEL_VERTICAL_CHROME`. The content is sliced to `visibleHeight` lines, so the search bar appears immediately after the sliced content regardless of remaining panel space.

## Goals / Non-Goals

**Goals:**
- Pin the search bar to the bottom edge of the response panel at all times
- Maintain correct scroll math — `visibleHeight` must still accurately represent the number of visible content lines
- Zero behavioral change to search functionality (input, matching, navigation)

**Non-Goals:**
- Changing search bar styling, colors, or content format
- Modifying search state management or key bindings
- Changing the response panel layout in any other way

## Decisions

### Decision 1: Use a flex spacer between content and search bar

Wrap the content in a `<Box flexGrow={1}>` container that expands to fill all remaining vertical space, pushing the search bar to the bottom. The search bar remains outside this growing container so it stays pinned at the bottom edge.

**Structure change:**
```
Before:
  <Box flexDirection="column" height="100%">
    <Text>Response</Text>
    {content}
    {searchBar}
  </Box>

After:
  <Box flexDirection="column" height="100%">
    <Text>Response</Text>
    <Box flexGrow={1} flexDirection="column">
      {content}
    </Box>
    {searchBar}
  </Box>
```

**Why over alternatives:**
- `justifyContent="space-between"` would also push searchBar down, but it would separate the title from the content with extra space, which is undesirable.
- An explicit `<Box height={n}>` spacer would require computing the remaining height manually — fragile and redundant since Ink's flex handles this natively.
- `flexGrow={1}` on the content wrapper is the idiomatic Ink/flexbox approach.

### Decision 2: Always render the search bar Box (conditionally show content)

To keep the bottom position stable, always render a `<Box height={1}>` at the bottom for the search bar slot. When no search is active, the Box is empty (renders nothing visible). This prevents layout jitter when toggling search on/off.

**Alternative considered:** Only render `{searchBar}` when `showSearchBar` is true (current behavior). Rejected because removing the element entirely causes the content area to visually jump by 1 line when search activates/deactivates.

**Update:** After review, the current `searchBarHeight` calculation already reserves the space dynamically, and the `visibleHeight` adjusts accordingly. The layout jitter is already handled by the height math. Keeping conditional rendering (current approach) is fine — the `flexGrow` wrapper on content ensures the search bar stays at the bottom regardless.

### Decision 3: No changes to visibleHeight calculation

The existing calculation `visibleHeight = availableHeight - RESPONSE_PANEL_VERTICAL_CHROME - searchBarHeight` correctly computes how many content lines to show. The flex layout change is purely visual positioning — the number of visible lines doesn't change.

## Risks / Trade-offs

- **[Low] Ink flex behavior edge cases** → The `flexGrow={1}` approach is standard flexbox. Ink's flex implementation follows CSS flex conventions. Verified by existing usage of `flexGrow={1}` in `Layout.tsx` line 34.
- **[Low] Content overflow with flexGrow** → If content lines exceed `visibleHeight`, they're already sliced before rendering, so the growing Box won't overflow — it just provides empty space below short content.
