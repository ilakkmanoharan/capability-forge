# Tests, BDD, and TDD

## Commands

```sh
npm test
npm run test:unit
npm run test:bdd
npm run test:integration
npm run test:coverage
npm run audit
```

Tests use Node.js 24's built-in runner and require no external dependencies or model keys. Coverage counts modules exercised by those tests; it is not proof of UI, model, or assignment completeness. `npm run audit` separately inspects committed run evidence and requires the genuine saved artifact.

## Suites

| Suite | Purpose |
| --- | --- |
| unit/policy.test.ts | Exact origins and ports, credentials, routes, empty allowlists, unknown risk, malformed URLs, and stable regex state |
| unit/session.test.ts | Valid/invalid ownership transitions, epoch increments, stale tokens, repeated handoffs, isolated instances |
| unit/domain.test.ts | Synthetic members/accounts, typed decimal strings, absence and validation outcomes, immutable fixture results |
| bdd/core.test.ts | Executable Given/When/Then examples for policy, business outcomes, parameters, and ownership |
| integration/runtime.test.ts | Artifact tampering, replay with a forbidden provider callback, business/error results, bounded waits, checkpoints, output validation, real ownership handoff in an adapter test double, redaction, provider response parsing and error mapping |

The `.feature` file is a readable companion. Node executes `core.test.ts`; there is no Gherkin parser or Cucumber engine. Keep both aligned when scenarios change.

## Genuine browser verification

The browser checks operate the real console and frame. They cover parameterized replay, exceptional states, and same-session takeover. These are distinct from adapter test doubles. `evidence/browser-checks.json` records the actual browser check results. Provider receipts in the genuine discovery run establish that the model endpoint responded during discovery. Replay reports independently have zero provider calls.

The automated adapter tests use scripted decisions and in-memory surfaces for determinism. They are explicitly fixtures and cannot substitute for genuine discovery evidence. `evidence/development/` retains setup failures and development-fixture browser runs separately from submission evidence.

## TDD process and actual history

Write one observable behavior first. Run its focused test and verify the intended failure. Implement the smallest correction, refactor, and rerun the relevant suite. Run the full suite after changing a shared execution boundary. Prefer outcome, denial, and state invariants over tests that simply mirror a function's implementation.

The policy expansion used this process: tests first exposed unknown/missing risk acceptance, regex mutation, and inconsistent invalid-URL errors. Production changes then made them pass. Domain interfaces also began with failing tests, though missing-module failures are weaker evidence than failed assertions. SessionControl existed before its regression-matrix expansion. The later end-to-end runner was integrated with tests and live-browser verification; we do not claim every line originated through test-first development.

## Tests that matter next

Add a remote-adapter conformance suite, a compiler check across every runtime module, crash/restart evidence tests, and authenticated multi-operator lease tests before expanding scope. Current Node execution strips TypeScript syntax and does not perform compiler type checking.
