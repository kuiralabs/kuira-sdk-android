---
title: Deploy and call a Compact contract
tags:
  - contracts
  - compact
  - circuits
  - proving
prerequisites:
  - Kuira added (recipe 1)
  - Sigil set up (recipe 2)
  - A compiled .compact contract under contract/src/managed/<name>/
agent_bundle: https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/deploy-and-call-a-compact-contract.md
---

# Deploy and call a Compact contract

**Outcome:** your app deploys a compiled Compact contract, gets the
contract address, and calls one of its circuits with witnesses — going
end-to-end from `.compact` source to an on-chain transaction.

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/deploy-and-call-a-compact-contract.md"
     data-task="Wire a compiled Compact contract into this Kuira-using Android app — sync the compiled artifacts into assets, construct a MidnightContract with the right witnesses, deploy it via the SDK, and call one of its circuits."></div>

---

## Prerequisites

- The previous two recipes completed (SDK added, sigil bootstrapped).
- A `.compact` contract that has been **compiled with the matching
  compactc version** — the runtime version pinned in your contract's
  `package.json` (`@midnight-ntwrk/compact-runtime`) must match what
  the SDK expects. If you mismatch, the runtime will throw a
  bytecode-version error at load.
- Compiled artifacts under `contract/src/managed/<contract-name>/`:
  - `contract/index.js` — the contract runtime entry
  - `keys/*.prover`, `keys/*.verifier` — per-circuit proving + verifying keys
  - `zkir/*.bzkir` — the ZK intermediate representation

If you don't have these yet, run `npm run compact` (or your project's
equivalent) inside the `contract/` directory first.

!!! warning "Compact authoring is a 'you provide' prereq"
    This recipe wires a **pre-compiled** Compact contract into your
    Android app. **It does not teach Compact authoring** — writing a
    `.compact` source file, installing `compactc`, or setting up the
    JS toolchain. For that, see **[Hello Compact](hello-compact.md)**,
    or clone the [Midnight Network sample
    contracts](https://github.com/midnightntwrk). This recipe assumes
    the `contract/src/managed/<name>/` directory already exists;
    getting to that point is covered there.

---

## Step 1 — Sync the compiled artifacts into your app's assets

The SDK's compact engine loads contract code + circuit keys from
your APK's assets. The canonical layout is:

- `assets/runtime/<contract-alias>-contract.js`
- `assets/keys/*.prover`, `*.verifier`, `*.bzkir`

There are two ways to wire it. The Gradle plugin is the recommended
path; it's published to Maven Central as
`{{ kuira_contract_plugin_version }}`. The hand-rolled `Copy` task is
the equivalent if you'd rather not add the plugin — it produces the
same asset layout the plugin would.

=== "Gradle plugin (recommended)"

    ```kotlin title="settings.gradle.kts"
    pluginManagement {
        repositories {
            gradlePluginPortal()
            mavenCentral()                                                  // (1)
        }
    }
    ```

    ```kotlin title="app/build.gradle.kts"
    plugins {
        id("com.android.application")
        id("io.github.kuiralabs.contract") version "{{ kuira_contract_plugin_version }}"
    }

    kuiraContract {
        source.set("contract/src/managed/your-contract")
        // alias.set("your-contract")                                       // (2)
    }
    ```

    1. The plugin ships to Maven Central. Add `mavenCentral()` to
       `pluginManagement.repositories` so `plugins { id(...) }` can
       resolve it. (It is not listed on the Gradle Plugin Portal, so
       this repo entry is required.)
    2. `alias` is optional — defaults to the dirname of `source`. So
       `contract/src/managed/penalty` resolves to alias `penalty`,
       which lands the contract JS as
       `assets/runtime/penalty-contract.js`.

    The plugin registers two tasks:

    - **`validateKuiraContractSource`** — verification task that
      always runs and fails fast with a helpful message if the source
      directory is missing (`"compile your contract first — npm run
      compact …"`). Catches the "forgot to compile" mistake at build
      time, not at runtime.
    - **`syncContractAssets`** — the actual copy: `contract/index.js`
      → `assets/runtime/<alias>-contract.js`, `keys/*.{prover,verifier}`
      and `zkir/*.bzkir` → `assets/keys/`. Wired into `preBuild` so
      it runs automatically before any APK is assembled.

=== "Hand-rolled Copy task"

    If you'd rather not add the plugin, hand-roll the same task. This
    is what the plugin replaces — same output, more lines.

    ```kotlin title="app/build.gradle.kts"
    val contractDir = rootProject.file("contract")
    val contractManaged = file("$contractDir/src/managed/your-contract")

    val syncContractAssets = tasks.register<Copy>("syncContractAssets") {
        description = "Sync compiled Compact contract artifacts into app assets."
        group = "build"

        from("$contractManaged/contract") {
            include("index.js")
            rename { "your-contract-contract.js" }
            into("runtime")
        }
        from("$contractManaged/keys") {
            include("*.prover", "*.verifier")
            into("keys")
        }
        from("$contractManaged/zkir") {
            include("*.bzkir")
            into("keys")
        }
        into("src/main/assets")

        doFirst {
            if (!contractManaged.exists()) {
                throw GradleException(
                    "Contract not compiled at $contractManaged — run " +
                    "`npm run compact` in your contract directory first.",
                )
            }
        }
    }

    tasks.named("preBuild") { dependsOn(syncContractAssets) }
    ```

    To switch to the plugin later, replace this entire block with the
    four-line `kuiraContract { source.set("…") }` plugin pattern in the
    other tab.

**Verify:** after `./gradlew :app:assembleDebug`, unzip the resulting
APK and confirm `assets/runtime/your-contract-contract.js`,
`assets/keys/*.prover`, `assets/keys/*.verifier`, `assets/keys/*.bzkir`
are all present.

---

## Step 2 — Build the contract handle

```kotlin
import android.content.Context
import com.midnight.kuira.core.compact.MidnightContract
import com.midnight.kuira.core.compact.WitnessResult

suspend fun buildContract(
    context: Context,
    sdk: MidnightSdk,
    contractAddress: String? = null,    // (1)
): MidnightContract {
    // Deploy embeds each circuit's verifier key on-chain — load the bytes.
    val verifier = context.assets
        .open("keys/yourCircuit.verifier").use { it.readBytes() }
    return MidnightContract.create(sdk.config) {     // (2) config is positional
        name = "yourcontract"
        contractJs = context.assets.open("runtime/yourcontract-contract.js")  // (3)
        if (contractAddress != null) this.address = contractAddress
        coinPublicKey = sdk.coinPublicKey
        circuitVerifierKeys = mapOf("yourCircuit" to verifier)
        witness("localSecret") { WitnessResult(null, ByteArray(32) { 0 }) }  // (4)
    }
}
```

1. `null` while you're still going to call `deploy()` — set this to the
   returned address for every subsequent call.
2. `create()` takes the SDK's `MidnightConfig` (`sdk.config`) as its first
   argument — not an `sdk` builder property.
3. `contractJs` is an **`InputStream`** from your assets — the synced
   `runtime/<alias>-contract.js`, not a path string.
4. `witness(name) { … }` — stub; replace with your contract's actual witness
   layout. (A contract with no private state, like the counter, omits this.)
   For typed witnesses (`Vector<N, T>`, `Bytes<32>`, …), pack the bytes by
   hand.

**Verify:** the function returns without throwing — meaning the
QuickJS runtime found and loaded your contract JS, and witness
descriptors typecheck against the bytecode.

---

## Step 3 — Deploy

```kotlin
// ProvingKeyManager lives in com.midnight.kuira.core.compact.proving.
// Required once before the first deploy/call: stage your circuit's proving
// keys (+ BLS params) from assets where the on-device prover looks. Idempotent.
ProvingKeyManager(context).installCircuitKeysFromAssets()

val deployResult = contract.deploy()
val address = deployResult.contractAddress
Log.i("MyApp", "Deployed at $address")
```

`deploy()` performs the deploy transaction, waits for the indexer to
confirm it, and returns the contract address. Re-use this address for
every subsequent `MidnightContract.create(sdk.config) { … address = address }`
call.

**Verify:** `address` should be a 64-character hex string. Rebuild the
handle with `this.address = address` and call `contract.ledger()` — it
returns the deployed contract's initial state.

---

## Step 4 — Call a circuit

Circuit arguments are **positional varargs** in the circuit's declared
order — plain Kotlin values, auto-converted to JS. The first argument is
the circuit name:

```kotlin
// e.g. a counter's `increment(by: Uint64)`:
val receipt = contract.call("increment", 1L)

// with progress feedback (proving → balancing → submitting):
val receipt = contract.call("increment", 1L) { stage ->
    Log.d("MyApp", "call stage: $stage")   // ContractCallStage
}
```

`call(circuitName, vararg args, onProgress)`:

1. Generates the ZK proof using the artifacts you synced in step 1.
2. Submits the resulting transaction via the wallet.
3. Waits for indexer confirmation.
4. Returns a **`TransactionReceipt`** (tx hash, status, timings) — **not**
   the new state. Read state separately with `contract.ledger()` or
   `observeLedger()` (below).

!!! warning "Anchor deadlines to chain time, not the device clock"
    If a circuit takes a deadline argument, derive it from the latest
    **block timestamp**, not `System.currentTimeMillis()` — wall-clock
    drift between the device and the chain can blow the deadline and get
    the transaction rejected.

**Verify:** the transaction confirms within ~10s on PREPROD. Query
`contract.ledger()` and check the field your circuit mutates.

---

## Step 5 — React to state changes (optional)

Rather than poll `ledger()` in a loop, `observeLedger()` emits the
current state immediately, then a fresh `MidnightLedger` every time the
contract's on-chain state actually changes:

```kotlin
contract.observeLedger().collect { ledger ->
    val count = ledger.getUint64("count")   // your circuit's field
    // update UI…
}
```

It's backed by the chain's block stream (falling back to polling on a raw
config), and de-duplicates the raw state before decoding — an unchanged
block costs only a state fetch, not a re-decode.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Contract not compiled at …` at Gradle time | Step 1 prereq not done. | Run `npm run compact` in `contract/`. |
| `Unsupported bytecode version` at runtime | Your compactc emitted bytecode for a different runtime version than the SDK ships. | Pin compactc to match your contract's `@midnight-ntwrk/compact-runtime` version. |
| `Indexer says contract not found` after deploy | Indexer hasn't caught up yet. | Add a 3–5s delay between deploy and first call. |
| `Invalid witness` at call time | Witness `ByteArray` length doesn't match the circuit's declared shape. | Cross-check the witness layout against the circuit's declared shape. |
| `Deadline expired` even though you set it in the future | Using `System.currentTimeMillis()` instead of chain time. | Switch to chain-anchored time (last block's timestamp). |

---

## What's next

- **[Back up wallet data across devices](back-up-wallet-across-devices.md)**
  — testing on **PreProd**? The wallet's first sync replays from genesis
  (slow); cloud backup turns it into a fast delta restore. Set it up *before*
  you test on PreProd so you're not stuck watching a genesis replay — and note
  it needs a one-time Google OAuth client or it silently no-ops.
- **Browse the [API reference](../api/)** for the full `MidnightContract`,
  `MidnightWallet`, and circuit-execution surface.
- **[Security § Verifying releases](../security.md#verifying-releases)**
  — pin and verify the exact SDK artifact for your release builds.
