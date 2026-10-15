# capability-forge

An LLM discovers a workflow through a live browser UI. The successful run becomes a versioned, typed capability that replays without a model. A minimal operator console transfers control of the same live frame to a human when a session expires or an unknown dialog blocks progress.

## Demonstrated

- Genuine OpenAI Responses discovery completed with five model decisions against a live UI.
- The resulting JSON capability replayed with a different member and account type, with zero model calls.
- Missing member, invalid input, permission denial, application error, slow load, known interstitial, and ambiguous targeting have live-browser evidence.
- Session-expiry takeover, manual restoration, and resume completed with one unchanged session ID and captured operator action metadata.
- The execution boundary blocks a risky action. Saved evidence excludes member IDs, balances, raw model text, and credentials.

Start with [the evidence index](evidence/README.md) and [the design report](REPORT.md). The local fixture is fictional and contains no real customer data.

## Setup

Requires Node.js 24 or newer and a modern browser. There are no third-party runtime packages and no npm installation step.

```sh
cp .env.example .env
# Edit .env locally to configure OPENAI_API_KEY.
npm test
npm start
```

Open **http://127.0.0.1:4317/** and keep one console tab open. The browser runs the automation against a same-origin frame. The Node server calls the model and persists sanitized evidence.

`.env` contains `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default `gpt-4.1-mini`). Keys stay server-side. Restart the server after changing the key or model. Never commit credentials. A key may authenticate while lacking available API credits.

## Demo commands

With the server running and the console open, use another terminal:

```sh
npm run discover -- --member=10001 --account=Savings
npm run replay -- --member=10002 --account=Checking --show-outputs
npm run replay -- --member=99999 --account=Savings
npm run replay -- --member=10002 --scenario=known
npm run replay -- --member=10002 --scenario=expired
```

The CLI queues a command that the open console claims and executes. It does not bypass the browser or read fixture data directly. CLI output redacts returned data unless `--show-outputs` is supplied. Use that flag only for the synthetic demo or an authorized destination. A `failure` returns exit code 1, while success and declared business outcomes return 0.

For `expired`, use the console's **Take control of live session**, click **Restore demo session** in the existing frame, then **Resume automation**. The CLI waits while you intervene. Do not reload the frame during a handoff.

You can perform the same flow with the console buttons. Choose **Normal**, discover, inspect **Saved capability JSON**, change parameters, and replay.

## Without live services

The committed capability in `evidence/capability.json` came from genuine discovery and can replay without a model key or network access to OpenAI. The app still needs local loopback networking.

The **Load development fixture** button is an explicitly labeled alternative for development. Commands can also use `--fixture`. Such replay reports carry `development-fixture` provenance and do not count as model discovery. Unit and deterministic integration tests use no model access at all.

## Validation

```sh
npm test
npm run test:unit
npm run test:bdd
npm run test:integration
npm run test:coverage
npm run audit
```

The audit validates the capability schema, matches its digest to genuine provider receipts, checks zero replay model calls, verifies same-session handoff evidence, and scans for accidental credential and raw-evidence leaks.

## Documentation

- [Walkthrough and expected results](docs/DEMO.md)
- [Architecture and module guide](docs/ARCHITECTURE.md)
- [Testing, BDD, and TDD](docs/TESTING.md)
- [Development and limitations](docs/DEVELOPMENT.md)
- [Specification](SPEC.md)
- [Completed scope and remaining extensions](TASKS.md)

## Boundaries

This is a local end-to-end vertical slice for one reviewed balance-lookup capability. The DOM adapter uses visible labels, headings, row labels, and explicit frame context, without test IDs. Desktop adapters, remote cross-origin injection, production authentication, multi-tenant orchestration, and a full operator service are design extensions. Native TypeScript type stripping is not a compiler type check. The report describes these cuts and the security boundary honestly.
