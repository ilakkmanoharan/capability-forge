# capability-forge design report

## Architecture

A single Node.js process serves the operator console, synthetic legacy-style application, model endpoint, and evidence store. A browser adapter operates a live same-origin frame. Discovery and replay share the execution policy, session owner, target resolver, checkpoints, and extraction code. The agent never imports the demo's domain module or queries its records directly.

Discovery sends sanitized observations to OpenAI Responses and receives one schema-constrained action at a time. A successful run required five genuine model decisions. The recorder compiles validated actions only after output and identity verification. Replay accepts a capability and typed inputs and has no provider call path. The Node endpoint independently refuses model requests for replay run IDs. This avoids infrastructure overhead while making the model/replay boundary testable.

## Artifact schema

`schemas/capability.schema.json` defines schema version 1.0. A separate capability revision, 1.0.0, identifies behavior changes. The artifact includes typed inputs and outputs, sensitivity flags, decimal-string patterns, ordered actions, explicit frame targets, bounded waits, declared business outcomes, and completion conditions. No executable expressions, script bodies, credentials, or discovered values belong in it.

Member IDs use parameter references. The recorder canonicalizes the chosen account button to `{{accountType}} details`, so one recording serves both supported account types. Output definitions identify rows rather than storing balances. A bounded validator checks structure, while semantic checks pin the reviewed input/output contract, reject duplicate steps and unsafe targets, and restrict checkpoints. Completion verifies the member ID and account type before reading outputs. Digests connect run evidence to an exact artifact. This is a deliberately narrow declarative language, not a generic workflow DSL.

## Determinism & error handling

Replay resolves visible controls uniquely through labels, role/name pairs, row labels, and frame scope. Zero matches fail; multiple matches stop with `target_ambiguous`. It never guesses the first element or calls an LLM. Checkpoints confirm each screen. Bounded polling handles delayed loads; a reviewed interstitial has one explicit dismissal. The system retries only a read-only search after manual session restoration and never blindly retries mutations.

Results distinguish success with typed outputs, declared business outcomes such as `member_not_found`, and structured failures. Failure evidence includes the step and sanitized structural state. Permission denials and app errors stop. Unknown dialogs and session expiry request intervention. Max-step and wall-clock budgets bound discovery. Live evidence covers a different-input replay, absent member, invalid input, permission denial, app error, slow load, known interstitial, ambiguity, and session recovery. Test stubs remain separate from genuine provider receipts.

## Heterogeneity & multi-tenant

The `Surface` seam exposes observation, action, conditions, extraction, and session identity. The implemented adapter uses a framed, table-oriented web UI with no test IDs. Running it as same-origin browser code keeps this demo dependency-free. Arbitrary remote and native apps require a content-script/CDP or accessibility adapter plus conformance tests; this implementation does not claim desktop support.

A future vendor/version profile can hold reviewed target bindings and entry points, with institution overrides kept separate from flow semantics. Overrides must not widen policy. Compatibility gates and checkpoint certification would detect drift before reuse. Tenant isolation and orchestration need production controls; they are not simulated by adding a tenant field to this demo.

## Escalation & handoff

Session ownership is automation, paused, human, completed, or failed. Transfers increment an epoch, and stale automation tokens cannot act after a takeover. Actions in the current adapter complete synchronously and the runner checks in-flight state before transfer. The frame overlay remains locked until a human claims control. Exception context includes the run step, safe state, reason, and session ID.

The operator acts in the existing frame. The adapter captures click/input metadata only while human ownership is active, omitting typed values and recording whether the browser marked input trusted. Resume rejects unresolved exceptions, a replaced document, and a mismatched checkpoint. A real browser test restored an expired session and completed replay with an unchanged session ID and a recorded manual action. A production asynchronous adapter must implement cancellation/draining semantics rather than assuming this synchronous guarantee generalizes.

## Safety

Both discovery and replay enforce trusted origin/path, frame, action-type, control, and risk allowlists at the action boundary. Only reviewed reversible/read-only operations are available. The configurable policy and fixed capability contract block irreversible operations. UI text cannot change this policy. Ambiguity fails closed.

Observations include static allowed labels and a filled boolean, never input values or account balances. Unknown text becomes `[REDACTED]`. The goal passes through a restricted vocabulary before model transmission. The provider uses `store:false`; this is not a claim about all provider retention policies. Persistence projects events onto allowed metadata, redacts outputs, and keeps safe structural failure snapshots instead of raw screenshots. Keys remain in ignored owner-only local files. Host/origin checks protect the local HTTP seam, but the console and evidence are not an authenticated production audit system. A same-origin malicious script or compromised local operator remains outside this demo's trust boundary.

## Cuts

The slice implements every required mechanism with genuine discovery and live replay/handoff evidence. It excludes production bank access, account mutations, screenshot-only targeting, desktop support, cross-origin remote control, distributed execution, operator authentication, full Gherkin tooling, and automated tenant certification. The BDD scenarios run on Node's test runner, while their `.feature` companion is descriptive. TypeScript contracts plus runtime schemas provide data contracts; Node execution strips types without compiler checking.

Next work would add a browser-independent adapter conformance suite, compile-time checking for every module, stronger policy and evidence authentication, incremental crash-safe evidence, and explicit adapter cancellation before expanding to other surfaces. Publication and the submission email remain separate human review steps.
