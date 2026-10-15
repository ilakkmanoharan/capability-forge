# Genuine run evidence

[capability.json](capability.json) came from genuine live OpenAI Responses discovery. It is a parameterized flow rather than a raw transcript.

| Run | Mode | Result | Model calls | Operator handoff |
| --- | --- | --- | --- | --- |
| [c81f53b4-4275-488e-94ae-a4fde6da4cf9](c81f53b4-4275-488e-94ae-a4fde6da4cf9.json) | discovery | success | 5 | no |
| [344881a1-5534-4677-884f-a9f9c3902090](344881a1-5534-4677-884f-a9f9c3902090.json) | replay | success | 0 | no |
| [2a531bd5-6f00-4fc3-9b12-a81bdff85304](2a531bd5-6f00-4fc3-9b12-a81bdff85304.json) | replay | business_outcome / member_not_found | 0 | no |
| [e4ec0410-53ed-418b-b583-aaccaeb2eb90](e4ec0410-53ed-418b-b583-aaccaeb2eb90.json) | replay | failure / invalid_inputs | 0 | no |
| [f34cceb8-7aaf-454b-95d1-46a2d6f4372d](f34cceb8-7aaf-454b-95d1-46a2d6f4372d.json) | replay | failure / permission_denied | 0 | no |
| [adfddd9e-9736-4a41-8ae6-c70c9bfe520d](adfddd9e-9736-4a41-8ae6-c70c9bfe520d.json) | replay | failure / app_error | 0 | no |
| [98f4cc06-c5bd-4f96-b052-5975c2bca699](98f4cc06-c5bd-4f96-b052-5975c2bca699.json) | replay | success | 0 | no |
| [5e487616-a5cb-41ae-86ca-4850388916b4](5e487616-a5cb-41ae-86ca-4850388916b4.json) | replay | failure / target_ambiguous | 0 | no |
| [7692b8b8-12e0-470f-b86d-f68451e9746b](7692b8b8-12e0-470f-b86d-f68451e9746b.json) | replay | success | 0 | no |
| [27eeb1c1-6af8-4c4d-bdd0-7d0dad2c8651](27eeb1c1-6af8-4c4d-bdd0-7d0dad2c8651.json) | replay | success | 0 | yes |
| [7af4f7a4-d06e-404a-adcf-17aa685573f2](7af4f7a4-d06e-404a-adcf-17aa685573f2.json) | replay | success | 0 | no |

Each report has a same-name JSONL event file. Provider receipts include actual response IDs, model versions, and token usage. The capability SHA-256 ties runs to the saved artifact. Replay reports have zero model calls and no provider receipts.

The handoff report records intervention, claim, an operator action, resume, and completion with one unchanged session ID. Codex computer-use acted as the test operator in the live browser.

Inputs, balances, arbitrary UI text, and credentials are absent from persisted evidence. [browser-checks.json](browser-checks.json) records real browser checks. [policy-proof.json](policy-proof.json) records a blocked risky action.

`development/` contains labeled development fixtures and unsuccessful setup attempts. They do not count as genuine discovery.

Run `npm run audit` to verify the artifact/receipt link, zero replay calls, same-session proof, and redaction. This verifies local evidence consistency, not cryptographic attestation.
