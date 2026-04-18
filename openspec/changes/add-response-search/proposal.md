## Why

When inspecting large JSON responses, users have no way to quickly locate specific values or keys. They must manually scroll through potentially hundreds of lines. A search function for the response body — triggered with `/` like vim/less — lets users jump directly to what they're looking for.

## What Changes

- Add a new `search` app mode activated by pressing `/` when in normal mode
- In search mode, capture text input as a search query (body-only, case-insensitive)
- On Enter, compute matching line indices against the response body, jump to the first match
- `n` / `N` in normal mode cycle forward/backward through matches with wrap-around
- Display a `►` arrow indicator on matching lines in the response panel (no substring highlighting in v1)
- Show an inline search bar at the bottom of the response panel with query text and match count (`[1/3]`)
- Escape cancels search and clears all search state

## Capabilities

### New Capabilities
- `response-search`: Keyboard-driven search within the response body panel — mode management, match computation, match navigation, scroll-to-match, and visual indicators

### Modified Capabilities
- `shortcuts`: Adding `/`, `n`, `N` keyboard shortcuts to the shortcut registry

## Impact

- **State**: `AppState` gains search-related fields (`searchQuery`, `searchMatches`, `currentMatchIndex`, `lastSearchQuery`); `AppMode` gains `'search'` variant; `Action` union gains 6 new action types
- **Components**: `ResponseView` gains props for search match display; new `SearchBar` component (inline, not overlay)
- **Input handling**: `useInput` in `app.tsx` gets a new search mode branch and n/N handling in normal mode
- **No new dependencies**: All implemented with existing Ink primitives (`Box`, `Text`)
- **No breaking changes**: All existing keyboard shortcuts and behavior are preserved
