## MODIFIED Requirements

### Requirement: Response Panel
The response panel SHALL render its title ("Response" or "Response [wrap]"), status line, headers, and body content correctly regardless of response body size. The bordered Box containing the response view SHALL maintain its full height within the right column layout, ensuring the title is always visible.

#### Scenario: Large response body renders title correctly
- **WHEN** a request returns a large response body (e.g., a JSON array with many entries)
- **THEN** the response panel SHALL display its "Response" title at the top of the bordered box, followed by the visible portion of the response content

#### Scenario: Response title visible with detail panel toggled
- **WHEN** the request details panel is toggled on and a large response is displayed
- **THEN** both the "Request Details" title and the "Response" title SHALL be visible in their respective bordered boxes