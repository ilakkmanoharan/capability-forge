# Architecture and code guide

## Runtime path

`src/server/server.ts` serves local resources and JSON endpoints, keeps credentials server-side, calls the model only for discovery run IDs, and writes sanitized evidence. It binds to loopback. The default capability loads from the genuine saved artifact at startup.

`src/browser/app.ts` coordinates the console, live frame, CLI command polling, model requests, and result display. Each new run starts a clean target document. During a human handoff it preserves that document and the same adapter instance.

`src/browser/surface.ts` is the actual UI adapter. It reads rendered headings, visible controls, labels, and row relationships, resolves exactly one target, executes click/fill events, and extracts visible table cells. It does not import the demo domain or call data endpoints. Same-origin access is a deliberate local-surface constraint.

`src/core/runner.ts` contains the discovery loop and deterministic replay executor. Its provider callback is reachable only in the discovery branch. It verifies inputs, step checkpoints, final identity, and typed outputs. Known recoveries are bounded. Exceptions route to either structured failure or an operator intervention. Runner instances are single-use.

`src/core/capability.ts` compiles successful validated steps into a reviewed contract, canonicalizes the account button binding, checks semantic constraints, and resolves parameter references. Equivalent JSON property order does not change contract validity.

`src/core/schema.ts` implements the bounded JSON Schema subset used by this repository. It checks object keys, required fields, arrays and limits, primitive types, constants, enums, patterns, and depth. It is not advertised as a complete JSON Schema implementation. Model output has a separate decision schema.

`src/core/guard.ts` is the execution boundary: origin/path, action, frame, control and risk rules; invocation/output validation; and safe observation projection. `src/core/policy.ts` retains the lower-level generic URL/action policy helper and its regression suite.

`src/core/session.ts` owns state and monotonically increasing ownership epochs. Invalid transitions preserve state. Terminal success/failure prevents further automation. `src/core/contracts.ts` describes typed parameters, results, targets, conditions, and the adapter seam.

`src/server/provider.ts` uses OpenAI Responses with strict structured output and validates the returned decision again locally. It maps auth, quota, rate-limit, malformed-response, and general service errors to safe codes. It does not persist raw response text or bearer credentials.

`src/server/evidence.ts` projects event/result objects onto allowed metadata. It drops arbitrary fields, redacts outputs, and scrubs UI labels before disk writes. Actual provider IDs and token usage are recorded separately by the server.

`src/demo/` is the synthetic target, shared fixture domain, and compatibility server entry point. Only the target application and its tests import fixture data. The automation operates the DOM surface.

## Data flow

A natural-language goal and sanitized UI observation go to the model. One validated decision passes through policy and target resolution. The next observed screen supplies a checkpoint. After final output/identity checks, the recorder emits a parameterized capability. Replay executes that artifact under the same policy and returns typed outputs in memory. Persistence drops sensitive output values.

## Session states

| Operation | Required state | Result |
| --- | --- | --- |
| pause | automation | paused |
| claimHuman | paused, no in-flight action | human |
| releaseHuman | human | paused |
| resume | paused, after runner verifies checkpoint | automation |
| complete | automation | completed |
| fail | any nonterminal state | failed |

The current DOM actions are synchronous. A future remote adapter needs an explicit cancellation/drain contract for asynchronous actions. A boolean cannot by itself stop already-issued remote input.

## Security and deployment boundary

The policy file is trusted local configuration and can only narrow the reviewed capability's controls without a code review. It is checked at action and extraction boundaries. Browser same-origin execution, local operator trust, and process-local command queues deliberately bound this implementation. Production remote apps and tenants require injection or CDP, authentication, signed artifacts, durable ownership, tamper-evident evidence, and isolation.
