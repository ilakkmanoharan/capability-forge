# Demo walkthrough

## Discovery and artifact

Start `npm start`, open http://127.0.0.1:4317/, and keep the console tab open. Enter member 10001, choose Savings and Normal, then click **Discover with live LLM**. Watch the model-request and decision events, then confirm success. The observed run used five model calls, but exact counts may vary on later genuine runs.

Expand **Saved capability JSON**. Inspect schema and capability versions, the member parameter reference, the account-type target binding, decimal output schema, per-step checkpoints, and final member/account identity checks. The saved artifact is `evidence/capability.json`; it is not a raw model transcript.

## Deterministic replay

Change to member 10002 and Checking, then click **Replay saved capability**. Expect `Checking`, `125.50`, `USD`, and `modelCalls: 0`. The synthetic fixture lets you verify those values manually, but the executor obtains them through the visible rows.

## Runtime conditions

| Scenario/input | Expected result |
| --- | --- |
| Normal, member 99999 | business_outcome / member_not_found |
| Invalid member 123 | failure / invalid_inputs, before UI action |
| Permission denied | failure / permission_denied |
| Application error | failure / app_error |
| Slow load | bounded wait, then success |
| Known interstitial | one declared dismissal, then success |
| Ambiguous target | failure / target_ambiguous, with safe state evidence |
| Session expired | pause for operator control |
| Unexpected dialog | pause rather than dismiss an unrecognized notice |

## Same-session human takeover

1. Choose Session expired and replay.
2. Note the session ID in the intervention and live-frame header.
3. Click **Take control of live session**. Ownership becomes human.
4. In the existing frame, click **Restore demo session**.
5. Click **Resume automation**. The checkpoint must pass before execution continues.
6. Confirm success, zero model calls, and the same session ID. The timeline includes intervention, claim, human action, resume, recovery, and completion.

For Unexpected dialog, claim control, dismiss the notice in the same frame, and resume. Refreshing the frame invalidates the session and prevents safe continuation. The console does not secretly create a new frame to recover from human intervention.

## Policy and evidence

Click **Demonstrate blocked risky action**. Expect `risk_blocked` and no UI action. Inspect `evidence/policy-proof.json` and the run JSON/JSONL files. Inputs, balances, credentials, arbitrary UI text, and raw model output must be absent. Failure snapshots contain safe screen/control structure.

Run `npm run audit` to verify provider receipts, artifact digests, zero replay calls, same-session proof, and redaction. The audit checks evidence consistency, not cryptographic trust in the local browser.

## CLI

Keep the console open, then use `npm run discover` and `npm run replay -- --member=10002 --account=Checking`. The CLI queues commands for that live console. `--scenario=expired` pauses until you complete the operator steps. `--show-outputs` prints synthetic output values; default CLI output redacts them.
