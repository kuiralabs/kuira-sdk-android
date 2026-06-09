---
title: Hello Compact — write your first contract
tags:
  - compact
  - contracts
  - hello-world
prerequisites:
  - compactc installed (the Kuira-pinned version is {{ compactc_version }}; see Toolchain below)
  - npm + a basic understanding of Compact's pragma + import directives
agent_bundle: https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/hello-compact.md
---

# Hello Compact — write your first contract

**Outcome:** you have a 6-line Compact contract that compiles, deploys
on a Midnight localnet, and exposes a single circuit that bumps a
shared counter by one — the universal "Hello World" of smart contracts.
You can read every line of the source and the compile output, you know
which `compactc` + language + runtime versions go together, and you
have a clear next stop for everything beyond "make the counter go up."

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/hello-compact.md"
     data-task="Write a minimal counter Compact contract for a Midnight dApp — single Counter ledger field, single zero-argument increment circuit. Pin compactc {{ compactc_version }}, pragma language_version {{ compact_language_version }}, @midnight-ntwrk/compact-runtime {{ compact_runtime_version }}. Compile via compactc, verify via mn contract inspect. Direct deeper learning to the official Midnight contract examples at midnightntwrk/midnight-docs."></div>

!!! tip "What this recipe is, and what it isn't"
    This is the **SDK's minimum-viable Compact intro** — enough to read
    the counter contract that ships with [`kuira-starter-android`](https://github.com/kuiralabs/kuira-starter-android),
    understand the toolchain pinning that makes it work, and compile +
    deploy it.

    For deeper Compact learning — witnesses, ZK proof construction,
    ledger types beyond `Counter`, multi-party patterns, on-chain
    verification of off-chain compute — go to the **[official Midnight
    contract examples](https://github.com/midnightntwrk/midnight-docs/tree/main/docs/examples/contracts)**.
    Calculator, election, battleship-simple, private-guest-list,
    private-reserve-auction, token-transfers. Each is a focused tutorial
    on one Compact pattern.

    The Kuira SDK consumes compiled Compact artifacts; it does not
    teach Compact authoring beyond what's in this recipe.

---

## The counter contract

```compact title="contract/src/counter.compact"
pragma language_version {{ compact_language_version }};

import CompactStandardLibrary;

export ledger count: Counter;

export circuit increment(): [] {
    count.increment(1);
}
```

Six lines. What each one does:

- `pragma language_version {{ compact_language_version }};` — pins the Compact language
  grammar version. The Compact language is versioned independently
  from `compactc` (the compiler) and from `@midnight-ntwrk/compact-runtime`
  (the JS runtime that compiled contracts call into). Mismatched
  versions produce a `language version X.Y.Z mismatch` error at
  compile time.
- `import CompactStandardLibrary;` — brings in the standard library
  types and helpers, including `Counter`.
- `export ledger count: Counter;` — declares a single on-chain ledger
  field, named `count`, of type `Counter`. The Standard Library's
  `Counter` wraps a `Uint<64>` with built-in `.increment()` and
  `.read()` helpers. `export ledger` makes the field readable by
  off-chain clients (the Kuira SDK reads it via
  `contract.ledger().getUint64("count")`).
- `export circuit increment(): [] { count.increment(1); }` — a single
  circuit that takes no arguments and bumps the counter by 1.
  Circuits are the on-chain entrypoints; calling one produces a
  ZK proof + a transaction that updates ledger state.

No witnesses, no privacy controls, no access checks. Anyone with Dust
can increment. The point is the SDK-integration story, not contract
design — for non-trivial patterns, jump to the [Midnight examples](https://github.com/midnightntwrk/midnight-docs/tree/main/docs/examples/contracts).

---

## Toolchain pinning

Three versions move independently. Mismatched values surface as
compile errors with the *generated* language version, not the version
you typed:

| Layer | Pinned value | Where it lives |
|---|---|---|
| `compactc` binary | **{{ compactc_version }}** | `~/.compact/versions/{{ compactc_version }}/aarch64-darwin/compactc` |
| Compact language pragma | **{{ compact_language_version }}** | `pragma language_version <v>;` in your `.compact` source |
| `@midnight-ntwrk/compact-runtime` | **{{ compact_runtime_version }}** | `contract/package.json` deps |

Each `compactc` binary self-introspects:

```bash
compactc --version            # → {{ compactc_version }}
compactc --language-version   # → {{ compact_language_version }}
compactc --runtime-version    # → {{ compact_runtime_version }}
```

When upgrading, run the three flags on the new binary first to
discover the matching triple before editing any pragma. The starter's
[`contract/README.md`](https://github.com/kuiralabs/kuira-starter-android/blob/main/contract/README.md)
documents the upgrade recipe step by step.

---

## Compile + verify

From your project root:

```bash
mkdir -p contract/src/managed
~/.compact/versions/{{ compactc_version }}/aarch64-darwin/compactc \
    contract/src/counter.compact \
    contract/src/managed/counter
```

Output: a `contract/src/managed/counter/` directory containing
`contract/index.js` (the runnable contract), `keys/increment.verifier`
+ `keys/increment.prover` (proving + verifying keys), and `zkir/` (the
intermediate representation). After syncing into your app's assets as
`runtime/<alias>-contract.js`, this is what the Kuira SDK consumes via
`MidnightContract.create(sdk.config) { contractJs = context.assets.open(...) }`.

Quick sanity check with the `mn` CLI:

```bash
mn contract inspect --managed contract/src/managed/counter
```

Output should show:

```
Compiler:       {{ compactc_version }}
Language:       {{ compact_language_version }}
Runtime:        {{ compact_runtime_version }}

Circuits
  increment()  — impure, proof

Witnesses
  (none)
```

If those three versions don't match what you have on disk, you've got
a mismatch between the `compactc` you ran and the `@midnight-ntwrk/compact-runtime`
your project pins. Re-align using the toolchain table above.

For a full localnet verify loop (deploy → call → read state), follow
the starter's
[`contract/README.md` § Verify against a localnet](https://github.com/kuiralabs/kuira-starter-android/blob/main/contract/README.md).

---

## Wire it into an Android app

Once the contract is compiled, the Kuira SDK consumes it as Android
assets. See **[Deploy and call a Compact contract](deploy-and-call-a-compact-contract.md)**
for the integration walkthrough — the `com.midnight.kuira.contract`
Gradle plugin (or a hand-rolled `syncContractAssets` Copy task), then
`MidnightContract.create(sdk.config) { … }` and `.deploy()` / `.call()`.

---

## Where to go from here

| Topic | Source |
|---|---|
| Working reference implementation | [`kuiralabs/kuira-starter-android`](https://github.com/kuiralabs/kuira-starter-android) — this counter contract end-to-end with Android UI |
| Witnesses + on-chain verification of off-chain compute | [Calculator example](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/calculator.mdx) (Midnight docs) |
| Multi-party patterns + commit-reveal | [Battleship Simple example](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/battleship-simple.mdx) (Midnight docs) |
| Selective-disclosure + private state | [Private Guest List](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/private-guest-list.mdx) + [Private Reserve Auction](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/private-reserve-auction.mdx) (Midnight docs) |
| Token + asset transfer patterns | [Token Transfers example](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/token-transfers.mdx) (Midnight docs) |
| Voting / quorum patterns | [Election example](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/election.mdx) (Midnight docs) |
| Full Compact language reference | [Midnight docs root](https://github.com/midnightntwrk/midnight-docs) (Midnight project) |

The Kuira SDK is happy to consume any Compact contract that `compactc`
produces — once you've moved beyond the counter, the Android-side
integration story doesn't change. Compile, drop the artifacts under
`contract/src/managed/<name>/`, point `MidnightContract.create` at
them, deploy, call.
