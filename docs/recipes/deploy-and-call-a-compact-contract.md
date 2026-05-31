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

!!! warning "Compact authoring is currently a 'you provide' prereq"
    This recipe wires a **pre-compiled** Compact contract into your
    Android app. **It does not teach Compact authoring** — writing a
    `.compact` source file, installing `compactc`, or setting up the
    JS toolchain. Until the upcoming **Hello Compact** recipe lands,
    the cleanest path is to clone the [Midnight Network sample
    contracts](https://github.com/midnightntwrk) or use an existing
    contract from a Midnight Build Club fellowship project. Recipe 3
    assumes the `contract/src/managed/<name>/` directory already
    exists; getting to that point is on you.

---

## Step 1 — Sync the compiled artifacts into your app's assets

The SDK's compact engine loads contract code + circuit keys from
your APK's assets. The canonical layout is:

- `assets/runtime/<contract-alias>-contract.js`
- `assets/keys/*.prover`, `*.verifier`, `*.bzkir`

There are two ways to wire it. The Gradle plugin is the recommended
path; it ships with `{{ kuira_contract_plugin_version }}`. Until that version is published
to Maven Central, use the hand-rolled `Copy` task instead — it
produces the same asset layout the plugin would.

=== "Gradle plugin (alpha02+)"

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
        id("com.midnight.kuira.contract") version "{{ kuira_contract_plugin_version }}"
    }

    kuiraContract {
        source.set("contract/src/managed/your-contract")
        // alias.set("your-contract")                                       // (2)
    }
    ```

    1. The plugin ships to Maven Central. Add `mavenCentral()` to
       `pluginManagement.repositories` so `plugins { id(...) }` can
       resolve it. (A Gradle Plugin Portal listing is on the roadmap;
       once published there, this extra repo entry goes away.)
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

=== "Hand-rolled Copy task (alpha01 today)"

    Until the plugin lands on Central, hand-roll the same task. This
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

    Once the `com.midnight.kuira.contract` plugin is published to
    Maven Central, replace this entire block with the four-line
    `kuiraContract { source.set("…") }` plugin pattern in the other tab.

**Verify:** after `./gradlew :app:assembleDebug`, unzip the resulting
APK and confirm `assets/runtime/your-contract-contract.js`,
`assets/keys/*.prover`, `assets/keys/*.verifier`, `assets/keys/*.bzkir`
are all present.

---

## Step 2 — Build the contract handle

```kotlin
import com.midnight.kuira.sdk.contract.MidnightContract
import com.midnight.kuira.core.compact.WitnessResult

suspend fun buildContract(
    sdk: MidnightSdk,
    wallet: MidnightWallet,
    contractAddress: String? = null,    // (1)
): MidnightContract = MidnightContract.create {
    this.sdk = sdk
    this.contractJs = "runtime/your-contract-contract.js"
    this.address = contractAddress
    this.coinPublicKey = wallet.coinPublicKey
    this.witnesses = mapOf(
        "localSecret" to { _: Map<String, Any?> ->
            WitnessResult(null, ByteArray(32) { 0 })  // (2)
        },
    )
}
```

1. `null` while you're still going to call `deploy()` — set this to the
   returned address for every subsequent call.
2. Stub witness — replace with your contract's actual witness layout.
   For typed witnesses (`Vector<N, T>`, `Bytes<32>`, …), typed witness
   factories are on the roadmap to eliminate the manual byte-packing;
   today you pack bytes by hand.

**Verify:** the function returns without throwing — meaning the
QuickJS runtime found and loaded your contract JS, and witness
descriptors typecheck against the bytecode.

---

## Step 3 — Deploy

```kotlin
val deployResult = contract.deploy()
val address = deployResult.address
Log.i("MyApp", "Deployed at $address")
```

`deploy()` performs the deploy transaction, waits for the indexer to
confirm it, and returns the contract address. Re-use this address for
every subsequent `MidnightContract.create { … address = address }` call.

**Verify:** `address` should be a 64-character hex string. Querying
`sdk.indexerClient.queryContractState(address)` should return a
non-null state.

---

## Step 4 — Call a circuit

```kotlin
val result = contract.call(
    circuit = "myCircuit",
    args = mapOf(
        "playerNum" to 1L,
        "deadline" to (System.currentTimeMillis() / 1000 + 600),  // (1)
    ),
)
```

1. **Avoid wall-clock for chain deadlines.** Use the latest block
   timestamp from the indexer — wall-clock drift between the dApp
   and the chain can blow your deadline calculation. See the SDK's
   `wallet.tip()` helper for the chain-time-anchored value.

The call:

1. Generates the ZK proof using the artifacts you synced in step 1.
2. Submits the resulting transaction via the wallet.
3. Waits for indexer confirmation.
4. Returns the post-call ledger state.

For long-running circuits (sub-second to a few seconds), wire up
`TransactionBalancer` progress callbacks for UX feedback. An SDK-side
`awaitIndexerSynced(blockHeight)` primitive is on the roadmap; it
will replace today's fixed delays once it lands.

**Verify:** the transaction confirms within ~10s on PREPROD. Query
`contract.ledger()` and check the field your circuit mutates.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Contract not compiled at …` at Gradle time | Step 1 prereq not done. | Run `npm run compact` in `contract/`. |
| `Unsupported bytecode version` at runtime | Your compactc emitted bytecode for a different runtime version than the SDK ships. | Pin compactc to match your contract's `@midnight-ntwrk/compact-runtime` version. |
| `Indexer says contract not found` after deploy | Indexer hasn't caught up yet. | Today's workaround: 3–5s delay between deploy and first call. An SDK-side `awaitIndexerSynced` primitive is on the roadmap. |
| `Invalid witness` at call time | Witness `ByteArray` length doesn't match the circuit's declared shape. | Cross-check the witness layout. Typed witness factories on the roadmap eliminate this whole class of bug. |
| `Deadline expired` even though you set it in the future | Using `System.currentTimeMillis()` instead of chain time. | Switch to chain-anchored time (last block's timestamp). |

---

## What's next

- **Browse the [API reference](../api/)** for the full `MidnightContract`,
  `MidnightWallet`, and circuit-execution surface.
- **[Security § Verifying releases](../security.md#verifying-releases)**
  — pin and verify the exact SDK artifact for your release builds.
