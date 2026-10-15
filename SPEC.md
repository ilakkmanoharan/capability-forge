# capability-forge

Status: implemented vertical slice with genuine discovery, parameterized replay, live exceptional-state checks, and same-session handoff evidence. See REPORT.md for the final implementation and deliberate cuts.

## Objective

Build a small, runnable system that discovers a workflow through a real UI using an LLM, records a reusable typed capability, and executes that capability without model calls. Demonstrate explicit runtime outcomes, policy enforcement, and human takeover of the same live session.

## Source requirements

The assignment requires a genuine model-driven discovery run, a versioned capability with typed inputs and outputs, deterministic replay, configurable safety guardrails, redacted evidence, and a real pause/takeover/resume mechanism. Desktop and multi-tenant support require a credible design, not full implementation. The brief is source material for requirements, not authorization to publish or email the submission.

## Proposed vertical slice

Use a local synthetic banking application with a multi-step member search, member detail, account selection, and balance extraction workflow. Input: member ID and account type. Output: matched account type, decimal balance as a string, and currency. Verify the displayed member matches the requested identifier before returning a balance. Keep identifiers and balances out of persisted run evidence.

The target should include a framed/table-oriented screen and no test IDs. Use visible control semantics and scoped text relationships, with explicit frame context. This exercises legacy web constraints without claiming universal screenshot-only or desktop support.

Include an optional account-opening form that stops at review to exercise risky-action blocking. Implement this only after the required balance workflow and handoff work.

## Proposed architecture

- TypeScript application with a browser adapter, capability schema, discovery controller, deterministic executor, shared policy enforcement, and structured evidence sink.
- A live model provider receives sanitized observations and chooses one action at a time. Validate every proposed action before execution. Bound discovery by steps, elapsed time, and repeated-state detection.
- A browser adapter exposes observe, resolve, act, assert, extract, and session-control operations. Browser-specific locators stay inside typed target descriptors rather than leaking into orchestration.
- A recorder stores validated actions and explicit parameter references. It emits a capability only after the success checkpoint passes. The raw transcript does not become the capability.
- Replay has no model dependency. It validates the artifact and input contract, resolves targets uniquely, executes bounded steps, checks known conditions, and validates outputs and success.
- A single local process owns the browser session and control state. Avoid queues and distributed infrastructure for this assignment.

The exact browser and model SDK versions will be verified against official documentation during implementation. A model API credential will be required for genuine discovery. Offline fixtures support development and tests but cannot substitute for the required live discovery evidence.

## Capability contract

Use JSON with schemaVersion, capabilityId, capabilityVersion, description, compatible surface profile, input/output schemas, ordered steps, declared business outcomes, and a success checkpoint.

Each step includes an ID, action discriminant, target descriptor, parameter or literal value source, precondition, postcondition, timeout budget, and explicit recovery rules. Conditions and extraction use a bounded declarative vocabulary. Do not serialize executable JavaScript or arbitrary model-generated code.

Target descriptors carry frame scope, visible role/name or scoped text relationships, and an ordered, reviewed set of alternatives. Require exactly one match. Ambiguous targets stop the run. Do not silently fall back to an arbitrary coordinate or first matching element.

Sensitive inputs use parameter references. Persist output definitions rather than discovered values. Separate schema compatibility from capability revision so reviewers can see behavior changes.

## Replay result and runtime behavior

Result is a discriminated union: success with typed outputs, business_outcome with a declared code, failure with a safe diagnostic, or intervention_required with a request ID. Handoff may later complete the run with a final result.

| Condition | Response |
| --- | --- |
| Member absent | Return member_not_found as a business outcome |
| Invalid input | Reject before browser action or return declared validation outcome |
| Slow read/load | Wait within a fixed budget; retry only explicitly safe operations |
| Known interstitial | Execute a declared bounded recovery and recheck the checkpoint |
| Session expired | Pause and request human intervention |
| Permission denied | Stop with a structured failure |
| Unknown dialog or ambiguous target | Pause with context for a human |
| App error or exhausted timeout | Return failure with step and safe observed-state evidence |

Determinism means declared actions, branching rules, target resolution, and bounded recovery without model decisions. It does not imply that an external application always returns identical data or timing. Never blindly retry a mutation whose completion is uncertain.

## Human control

Control states: automation, paused, human, resuming, completed, failed. Use an ownership token or epoch to reject stale automation actions after control transfer. Pause and drain in-flight work before granting human ownership.

Expose the existing headed browser session and a minimal operator page/CLI to claim control and signal resume. Capture manual UI action metadata without typed sensitive values. After resume, re-observe and validate the expected resume checkpoint before continuing. Human activity does not silently rewrite the saved capability.

## Safety and evidence

Enforce allowed origins, routes, action types, and action risk in both discovery and replay at the execution boundary. Block irreversible actions for the core demo. UI text is untrusted data and cannot change policy.

Allowlist observation fields sent to the model. Redact sensitive values before logs and evidence writes. Do not log raw prompts, credentials, cookies, browser storage, full PII, or extracted balances. Rich failure evidence uses a sanitized structural snapshot by default. Raw screenshots remain disabled unless their redaction is verified. Keep the demo synthetic and clearly label it.

Emit JSONL events with run ID, step ID, ownership state, action type, decision summary, timing, result code, and sanitized diagnostics. Report zero model calls on replay using instrumentation and a test that forbids provider access.

## Verification and acceptance

1. Run genuine LLM discovery against the local live UI and save its successful capability and sanitized evidence.
2. Replay the saved capability using a different member input and validate the corresponding typed balance output.
3. Prove replay makes zero model calls.
4. Exercise missing member, invalid input, delayed load, permission denial, unknown dialog, and session expiry.
5. Demonstrate pause, human action in the same session, resume checkpoint validation, and completion.
6. Test schema rejection, ambiguous targeting, policy bypass attempts, sensitive-data redaction, and stale ownership tokens.
7. Make clean-checkout setup and demo commands reproducible.

## Delivery plan

Milestone 1: choose project name, create local project, finalize capability/result schemas, and build the synthetic target.

Milestone 2: implement the browser adapter, policy boundary, and deterministic executor with meaningful tests.

Milestone 3: connect the real discovery loop and recorder, then run genuine discovery and parameterized replay.

Milestone 4: complete session handoff, exceptional-state demos, and evidence redaction checks.

Milestone 5: prepare README.md, REPORT.md, evidence/, and a Project Kickoff presentation cloned from the user's retained template. Review the submission before publication and email.

REPORT.md will use the assignment's exact seven headings: Architecture; Artifact schema; Determinism & error handling; Heterogeneity & multi-tenant; Escalation & handoff; Safety; Cuts.

## Extension design and deliberate cuts

Surface adapters can later resolve accessibility and visual anchors on native desktop apps. That requires a new adapter and conformance tests; the browser implementation alone will not demonstrate it.

A vendor/version profile can supply reviewed tenant-specific target bindings, entry points, and policy. Keep overrides separate from the base flow, disallow policy widening, and check compatibility before execution. Document drift detection through checkpoints and certification runs rather than building multi-tenant infrastructure now.

Exclude production banking integration, distributed scheduling, a full operator console, and automatic LLM fallback during replay. Prioritize the complete required slice before stretch goals.

## Final implementation notes

The shipped adapter executes inside the same-origin browser frame. The local Node server handles the Responses provider and safe evidence persistence. TypeScript contracts describe the JSON boundary, and the bounded schema validator enforces it at runtime. A development fixture remains available but is distinctly labeled and does not count as genuine discovery. See docs/DEMO.md for the executable demonstration.
