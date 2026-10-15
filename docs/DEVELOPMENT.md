# Development guide

Use Node.js 24+. The project has no external runtime dependencies. `npm start` launches the console and local banking fixture. Tests are offline. Discovery requires a funded OpenAI API project. Replay of the committed capability needs no model access.

## Working conventions

Keep changes explainable. Put UI mechanics in the adapter, orchestration in the runner, contracts in schema/capability modules, and data policy at execution/persistence boundaries. Never retrieve fixture records directly from automation. Write behavior and failure tests before adding new risky behavior. Keep test doubles distinct from genuine evidence. Do not add an LLM fallback to replay.

## Credentials

`.env` configures the running server. `.env.credentials.local` is an optional ignored local credential store and is not loaded automatically. Both use owner-only file permissions in this workspace. `.env.example` contains placeholders only. Keep every actual secret out of source control and review the secret audit before publication. Do not include local env files in an archive.

## Module changes

Schema changes require deliberate version compatibility and tamper tests. New controls need explicit policy review and target-resolution tests. New recoveries need bounded budgets and a justification for safe repetition. A new surface adapter must demonstrate identity, unique targeting, ownership transitions, and the ability to drain remote input before takeover.

## Error groups

Business outcomes: member_not_found and validation_error. Validation failures include invalid_inputs, schema_invalid, contract_changed, parameter_binding_invalid, and output_invalid. Execution failures include target_missing, target_ambiguous, checkpoint_timeout, load_timeout, permission_denied, app_error, and session_replaced. Model failures distinguish authentication, quota, rate limit, malformed decisions, and unavailability. Session expiry and unknown dialogs pause for human ownership.

## Evidence boundary

Actual outputs return to the caller in memory. The persistence layer redacts them. Safe state snapshots include headings, control descriptors, row labels, filled booleans, and loading/dialog flags. The evidence audit checks known synthetic values and local credential strings, but is not a universal PII detector. The primary protection is projection onto permitted fields before writing.

## Deliberate limits

One reviewed capability and one same-origin browser adapter. No desktop implementation, remote cross-origin injection, production auth, distributed ownership, generic arbitrary-language task coverage, or real bank access. The evidence is inspectable local JSON, not a cryptographically authenticated audit ledger. Core types and runtime schemas do not replace a future compiler/type-checking step.
