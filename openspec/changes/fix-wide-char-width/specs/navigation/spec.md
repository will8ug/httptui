## MODIFIED Requirements

### Requirement: RequestList renders with horizontal offset
The `RequestList` component SHALL accept a `horizontalOffset` prop and render each request line sliced from `horizontalOffset` display cells onward, truncated to the available panel width in display cells. Slicing SHALL snap to grapheme-cluster boundaries so no character is split by the offset (display-cell semantics are specified in the **display-width** spec).

#### Scenario: RequestList with zero offset
- **WHEN** `horizontalOffset` is `0`
- **THEN** the component SHALL render identically to current behavior (no visible change)

#### Scenario: RequestList with positive offset
- **WHEN** `horizontalOffset` is greater than `0`
- **THEN** each line of request content (method label and target path) SHALL be shifted left by `horizontalOffset` display cells, with the visible portion truncated to the panel width in cells

#### Scenario: Offset does not split a wide character
- **WHEN** `horizontalOffset` lands between the two cells of a wide character in a request line
- **THEN** the slice SHALL start at the next grapheme-cluster boundary, keeping the wide character whole

### Requirement: ResponseView renders with horizontal offset
The `ResponseView` component SHALL accept a `horizontalOffset` prop and render each line of response content (status line, headers, separator, body lines) sliced from `horizontalOffset` display cells onward, truncated to the available content width in display cells. Slicing SHALL snap to grapheme-cluster boundaries so no character is split by the offset (display-cell semantics are specified in the **display-width** spec).

#### Scenario: ResponseView with zero offset
- **WHEN** `horizontalOffset` is `0`
- **THEN** the component SHALL render identically to current behavior (no visible change)

#### Scenario: ResponseView with positive offset
- **WHEN** `horizontalOffset` is greater than `0`
- **THEN** each line of response content SHALL be shifted left by `horizontalOffset` display cells, with the visible portion truncated to the content width in cells

#### Scenario: Offset does not split a wide character
- **WHEN** `horizontalOffset` lands between the two cells of a wide character in a response line
- **THEN** the slice SHALL start at the next grapheme-cluster boundary, keeping the wide character whole
