---
title: "Hello Compact: write your first contract"
tags:
  - compact
  - contracts
  - hello-world
prerequisites:
  - compactc installed (the Kuira-pinned version is {{ compactc_version }}; see Toolchain below)
  - the contract npm project set up: `npm install` in `contract/` (pulls in `@midnight-ntwrk/compact-runtime` + the `compact`/`compactc` devtools), or copy the starter's `contract/` directory as a template
  - a basic understanding of Compact's pragma + import directives
agent_bundle: https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/hello-compact.md
---

# Hello Compact: write your first contract

**Outcome:** you have a 6-line Compact contract that compiles, deploys on a Midnight localnet, and exposes a single circuit that bumps a shared counter by one, the "Hello World" of smart contracts. You can read every line of the source and the compile output, you know which `compactc`, language, and runtime versions go together, and you know where to go for everything beyond "make the counter go up."

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/hello-compact.md"
     data-task="Write a minimal counter Compact contract for a Midnight dApp: single Counter ledger field, single zero-argument increment circuit. Pin compactc {{ compactc_version }}, pragma language_version {{ compact_language_version }}, @midnight-ntwrk/compact-runtime {{ compact_runtime_version }}. Compile via compactc, verify via mn contract inspect. Direct deeper learning to the official Midnight contract examples at midnightntwrk/midnight-docs."></div>

!!! tip "What this recipe is, and what it isn't"
    This is the SDK's minimum Compact introduction: enough to read the counter contract that ships with [`kuira-starter-android`](https://github.com/kuiralabs/kuira-starter-android), understand the toolchain pinning that makes it work, and compile and deploy it.

    To learn Compact and Midnight themselves (the language, witnesses, ZK proof construction, ledger types beyond `Counter`, and the on-chain model), start at the **[Midnight documentation](https://docs.midnight.network/)**, then its **[contract examples](https://github.com/midnightntwrk/midnight-docs/tree/main/docs/examples/contracts)** (calculator, election, battleship, private-guest-list, …) for focused tutorials on each Compact pattern. This recipe assumes that familiarity.

    The Kuira SDK consumes compiled Compact artifacts. It does not teach Compact authoring beyond what's in this recipe.

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

What each of the six lines does:

- `pragma language_version {{ compact_language_version }};` pins the Compact language grammar version. The Compact language is versioned independently from `compactc` (the compiler) and from `@midnight-ntwrk/compact-runtime` (the JS runtime that compiled contracts call into). Mismatched versions produce a `language version X.Y.Z mismatch` error at compile time.
- `import CompactStandardLibrary;` brings in the standard library types and helpers, including `Counter`.
- `export ledger count: Counter;` declares a single on-chain ledger field, named `count`, of type `Counter`. The Standard Library's `Counter` wraps a `Uint<64>` with built-in `.increment()` and `.read()` helpers. `export ledger` makes the field readable by off-chain clients (the Kuira SDK reads it by name with `contract.ledger().getUint64("count")`, or as a typed field on the generated contract facade).
- `export circuit increment(): [] { count.increment(1); }` is a single circuit that takes no arguments and bumps the counter by 1. Circuits are the on-chain entrypoints: calling one produces a ZK proof and a transaction that updates ledger state.

The contract has no witnesses, privacy controls, or access checks. Anyone with Dust can increment. It exists to show the SDK integration, not contract design. For non-trivial patterns, go to the [Midnight examples](https://github.com/midnightntwrk/midnight-docs/tree/main/docs/examples/contracts).

---

## Toolchain pinning

Three versions move independently. Mismatched values show up as compile errors with the generated language version, not the version you typed:

| Layer | Pinned value | Where it lives |
|---|---|---|
| `compactc` binary | **{{ compactc_version }}** | installed under `~/.compact/versions/{{ compactc_version }}/<os-arch>/`, driven by the `compact` wrapper |
| Compact language pragma | **{{ compact_language_version }}** | `pragma language_version <v>;` in your `.compact` source |
| `@midnight-ntwrk/compact-runtime` | **{{ compact_runtime_version }}** | `contract/package.json` deps |

!!! note "On-chain runtime ships with the node"
    The Compact **runtime** is also embedded in the Midnight node. `midnight-node:0.22.5`, the `mn localnet` default, ships on-chain Compact runtime **{{ compact_runtime_version }}**, the runtime this contract targets. Older nodes (`≤ 0.22.3`) run runtime `0.15.0` and **reject** a {{ compact_runtime_version }} contract with a runtime-version mismatch. If you stay on the default node, the versions line up.

The toolchain reports its own versions:

```bash
compact list                                                 # installed compilers + the default
compact compile +{{ compactc_version }} --language-version   # → {{ compact_language_version }}
compact compile +{{ compactc_version }} --runtime-version    # → {{ compact_runtime_version }}
```

The language and runtime flags belong to `compact compile` (the subcommand that owns them). There is no bare `compactc --runtime-version`.

When you upgrade, run the three commands on the new toolchain first to find the matching triple before you edit any pragma. The starter's [`contract/README.md`](https://github.com/kuiralabs/kuira-starter-android/blob/main/contract/README.md) documents the upgrade steps.

---

## Set up the contract project

The compiler and runtime live in a small npm project alongside your app. The fastest path is to copy the starter's [`contract/`](https://github.com/kuiralabs/kuira-starter-android/tree/main/contract) directory, which already pins the toolchain, and install it:

```bash
cd contract
npm install
```

This pulls in `@midnight-ntwrk/compact-runtime` (**{{ compact_runtime_version }}**, the JS runtime compiled contracts call into) and makes the `compact` and `compactc` devtools available, so the compile step below has everything it needs. The starter's `contract/package.json` also defines `npm run compile` and `npm run inspect` shortcuts for the commands you run by hand here.

---

## Compile + verify

From your project root:

```bash
mkdir -p contract/src/managed
compact compile +{{ compactc_version }} contract/src/counter.compact contract/src/managed/counter
```

!!! warning "Pin the compiler version with `+{{ compactc_version }}`"
    `compact` auto-selects the right binary for your platform, but it runs the toolchain's **default** compiler, which may be older than your `pragma language_version`. Compiling **without** the `+` pin fails with `language version X.Y.Z mismatch`; `+{{ compactc_version }}` forces the compiler that matches the pragma. (The `engines.compactc` field in `package.json` is informational. It is not enforced, and `npm run compile` must carry the same `+` pin.) Run `compact list` to see the installed versions and the default.

    The binary directory varies by OS and architecture (`aarch64-darwin`, `x86_64-darwin`, `x86_64-linux`, …), so never hardcode a path to it. On Windows, run under WSL2.

The output is a `contract/src/managed/counter/` directory containing `contract/index.js` (the runnable contract), `keys/increment.verifier` and `keys/increment.prover` (the verifying and proving keys), and `zkir/` (the intermediate representation). After you sync it into your app's assets as `runtime/<alias>-contract.js`, the Kuira SDK consumes it with `MidnightContract.create(sdk.config) { contractJs = context.assets.open(...) }`.

Run a quick check with the `mn` CLI:

```bash
mn contract inspect --managed contract/src/managed/counter
```

The compile also writes the machine-readable `contract/src/managed/counter/compiler/contract-info.json`, which records the exact triple the artifacts were built with, plus the circuit shapes. For the counter it looks like this (trimmed):

```json title="compiler/contract-info.json"
{
  "compiler-version": "{{ compactc_version }}",
  "language-version": "{{ compact_language_version }}",
  "runtime-version": "{{ compact_runtime_version }}",
  "circuits": [
    { "name": "increment", "pure": false, "proof": true }
  ],
  "witnesses": [],
  "ledger": [
    { "name": "count", "exported": true, "storage": "Counter" }
  ]
}
```

The exact field set changes with the compiler, so treat the block above as **illustrative, not a byte-for-byte match**. Read your own file rather than diffing against this one. The three `*-version` values are the triple your artifacts were built with. If they don't match the `@midnight-ntwrk/compact-runtime` and `pragma language_version` your project pins, re-align them using the toolchain table above.

For a full localnet verify loop (deploy → call → read state), follow the starter's [`contract/README.md` § Verify against a localnet](https://github.com/kuiralabs/kuira-starter-android/blob/main/contract/README.md).

---

## Wire it into an Android app

Once the contract is compiled, the Kuira SDK consumes it as Android assets. See **[Deploy and call a Compact contract](deploy-and-call-a-compact-contract.md)** for the integration walkthrough: the `io.github.kuiralabs.contract` Gradle plugin (or a hand-rolled `syncContractAssets` Copy task), then `MidnightContract.create(sdk.config) { … }` and `.deploy()` / `.call()`.

---

## Where to go from here

| Topic | Source |
|---|---|
| Working reference implementation | [`kuiralabs/kuira-starter-android`](https://github.com/kuiralabs/kuira-starter-android): this counter contract end-to-end with Android UI |
| Witnesses + on-chain verification of off-chain compute | [Calculator example](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/calculator.mdx) (Midnight docs) |
| Multi-party patterns + commit-reveal | [Battleship Simple example](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/battleship-simple.mdx) (Midnight docs) |
| Selective-disclosure + private state | [Private Guest List](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/private-guest-list.mdx) + [Private Reserve Auction](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/private-reserve-auction.mdx) (Midnight docs) |
| Token + asset transfer patterns | [Token Transfers example](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/token-transfers.mdx) (Midnight docs) |
| Voting / quorum patterns | [Election example](https://github.com/midnightntwrk/midnight-docs/blob/main/docs/examples/contracts/election.mdx) (Midnight docs) |
| Full Compact language reference | [Midnight docs root](https://github.com/midnightntwrk/midnight-docs) (Midnight project) |

The Kuira SDK consumes any Compact contract that `compactc` produces, and the Android-side integration stays the same beyond the counter: compile, put the artifacts under `contract/src/managed/<name>/`, point `MidnightContract.create` at them, deploy, and call.
