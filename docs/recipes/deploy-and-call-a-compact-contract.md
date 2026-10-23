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
        source.set("../contract/src/managed/your-contract")                 // (1b)
        // alias.set("your-contract")                                       // (2)
    }
    ```

    1. The plugin ships to Maven Central. Add `mavenCentral()` to
       `pluginManagement.repositories` so `plugins { id(...) }` can
       resolve it. (It is not listed on the Gradle Plugin Portal, so
       this repo entry is required.)
    1b. `source` is resolved relative to the **`app/` module**, and
       `contract/` is a sibling of `app/`, so the path needs the
       leading `../` — `../contract/src/managed/<name>`. (The
       hand-rolled tab below reaches the same directory differently,
       via `rootProject.file("contract")`.)
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
   Three rules govern what goes in here — see [Witness rules](#witness-rules-the-signature-doesnt-show)
   immediately below.

`yourCircuit` and `keys/yourCircuit.verifier` are placeholders — substitute
your circuit's real name. For the [Hello Compact](hello-compact.md) counter
that's `increment`, so the verifier is `keys/increment.verifier` and the
key in `circuitVerifierKeys` is `"increment"`.

**Verify:** the function returns without throwing — meaning the
QuickJS runtime found and loaded your contract JS, and witness
descriptors typecheck against the bytecode.

---

### Witness rules the signature doesn't show

Three rules govern every witness, and none of them is visible in `witness(name) { … }`.

**Bytes are the only carrier.** `WitnessResult.data` is a `ByteArray` whatever the Compact type says. A `Uint<64>` witness is packed by hand into its byte encoding rather than passed as a number — and so is every `Bytes<32>`, `Vector<N, T>`, and struct field.

**Declare every witness the contract declares — not only the ones you call.** The generated constructor looks up all of them when the handle is built, so leaving out a witness that the circuit you're calling never invokes still fails, and it fails at `create()` rather than at `call()`. The error names the missing witness and lists what you supplied.

**Your buffer stays yours.** The SDK copies the bytes out of the `WitnessResult` you return, so handing back an array you keep using — the sibling nodes held inside a Merkle tree, say — is safe across repeated proofs. Zeroing your own copy when you're finished is still worth doing; the SDK can't do it for you, because it can't know when you're done with it.

!!! warning "A constructor cannot read witnesses"
    A contract's constructor runs before any witness is available, so the usual *deployer-becomes-owner* pattern can't happen at deploy time. Make ownership a separate circuit that the deployer calls right after deploying.

### Constructor arguments

A contract whose constructor takes parameters — a multisig receiving its signer set and threshold, for instance — gets them from `constructorArgs`, in declaration order, as Kotlin values marshaled like circuit-call arguments:

```kotlin
MidnightContract.create(sdk.config) {
    name = "yourcontract"
    contractJs = context.assets.open("runtime/yourcontract-contract.js")
    coinPublicKey = sdk.coinPublicKey
    circuitVerifierKeys = mapOf("yourCircuit" to verifier)
    constructorArgs = listOf(signers, 2)
}
```

Leave it empty for a no-arg constructor, which is the counter and BBoard case. Set the same values on every handle you build for that contract, not just the one you deploy with: the call and read paths run the constructor too, to establish the state they then swap the on-chain state into.

---

## Step 3 — Deploy

!!! warning "The embedded wallet must hold Dust first"
    Deploying (and calling) burns **Dust** to pay for proving + on-chain
    execution. On a brand-new, unfunded embedded wallet, `deploy()` (or
    `call()`) **hangs forever at the "Balancing" stage** — it's waiting
    for Dust that never arrives.

    Fund and register Dust before your first deploy:

    1. Airdrop NIGHT to the embedded wallet's address (the airdrop
       command takes the raw embedded-wallet address directly):

        ```bash
        mn airdrop <amount> --wallet <embedded-wallet-address> --network undeployed
        ```

    2. Register Dust **in-app** — tap **Register dust** in the wallet
       panel. The CLI cannot register Dust for the embedded wallet; this
       step has to happen inside the app that owns the seed.

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

### The indexer lag after a deploy

A contract the node has finalized is not in the indexer the same instant, so a read or a call issued right after a deploy asks for something that doesn't exist yet. The window has no fixed length — localnet clears in a second or two, PreProd can take appreciably longer — which is why a fixed sleep is the wrong shape for it.

You don't have to handle this. `prepare()`, `ledger()` and `read()` each wait up to **30 seconds** for the contract to show up, polling every two seconds, and `deploy()` returns only once the deploy itself is indexed. Write the call you mean, right after the deploy, and let it wait.

Two cases stay yours. `observeLedger()` is a flow driven by ledger signals, so a blocking wait belongs to whoever collects it rather than inside the stream. And `readMany()` takes a `notIndexedTimeoutMs` budget if you want a different one — `0` restores fail-fast, which is what a test wants when an indexing problem should surface rather than hide behind a wait.

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

### Prefer the generated typed facade

`contract.call("increment", 1L)` is stringly-typed — a wrong circuit name
or argument type only fails on-device. The `io.github.kuiralabs.contract`
plugin also generates a typed `<Name>Contract` facade from your compiled
`contract-info.json`, so the same call is checked at **compile time**:

```kotlin
// Generated from contract-info.json: wrap the raw handle, then call
// circuits as typed methods carrying their real argument + return types.
val counter = CounterContract(contract)

// increment(by: Uint64) -> increment(by: BigInteger); the value is
// range-checked to the declared width. A Long or a String here won't compile.
val receipt = counter.increment(1.toBigInteger())

// progress callback is the same trailing lambda:
counter.increment(1.toBigInteger()) { stage -> Log.d("MyApp", "stage: $stage") }
```

The facade emits, per circuit: a `call`-style method for a write, `read<Name>()`
for an on-chain view (a value-returning circuit), and `local<Name>()` for a
`pure` circuit (computed locally, no deploy). Value returns come back **typed** —
`BigInteger`, `ByteArray`, generated `data class`es / `enum`s, `List<T>`, tuples.
`contract.call(...)` stays available as an escape hatch for anything the facade
doesn't model yet (it lists those in a KDoc note).

---

## Step 5 — React to state changes (optional)

Rather than poll `ledger()` in a loop, `observeLedger()` emits the
current state immediately, then a fresh `MidnightLedger` every time the
contract's on-chain state actually changes:

```kotlin
// Untyped: read fields by name off the raw MidnightLedger.
contract.observeLedger().collect { ledger ->
    val count = ledger.getUint64("count")   // your circuit's field
    // update UI…
}

// Typed (generated facade): a val per exported ledger field, decoded for you.
CounterContract(contract).observeLedger().collect { ledger ->
    val count = ledger.count                // BigInteger, no field name, no cast
}
```

`CounterContract(contract).ledger()` is the one-shot equivalent — a typed
`CounterLedger` snapshot. Fields the facade can't type yet (a `Map`/`Set`
ledger ADT) are read via the contract's own view circuits (`read<Name>()`) or
`ledger().getRaw(...)`.

Both are backed by the chain's block stream (falling back to polling on a raw
config), and de-duplicate the raw state before decoding — an unchanged block
costs only a state fetch, not a re-decode.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Contract not compiled at …` at Gradle time | Step 1 prereq not done. | Run `npm run compact` in `contract/`. |
| Deploy or call hangs at "Balancing" and never finishes | The embedded wallet has no Dust. | Fund it (`mn airdrop … --network undeployed`) and tap **Register dust** in-app, then retry. |
| `Unsupported bytecode version` at runtime | Your compactc emitted bytecode for a different runtime version than the SDK ships. | Pin compactc to match your contract's `@midnight-ntwrk/compact-runtime` version. |
| `Indexer says contract not found` after deploy | Finalized on the node, not yet in the indexer. | Nothing to add — `prepare()`, `ledger()` and `read()` already wait up to 30s for it. Past that, the indexer is unreachable or lagging: check its URL and that the container is up. |
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
