# The partial body lives in the response object

While a response streams, the partial body, status, and headers live in the ordinary response object in app state, populated when headers arrive and appended per coalesced update; the loading flag stays set until the body completes or the transfer is canceled. A parallel streaming-state field was considered and rejected: it would duplicate the render path (the response viewport already knows how to render a response) and create two sources of truth merged at completion.

## Consequences

- The long-standing invariant that loading and a present response are mutually exclusive is broken; every guard that assumed it (the response-save guard, the response view's branch chain, the response-visible key gates) must check both fields.
- A streaming response is a phase of an ordinary response, not a new kind; on completion or cancellation, every downstream feature (pretty-print, search, save) works unchanged.
