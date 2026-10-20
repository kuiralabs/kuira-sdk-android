---
title: On-device proving
---

# On-device proving

Kuira generates zero-knowledge proofs **on the phone** by default. There is
no proof server in the loop — the transaction's private inputs never leave the
device. This page explains what that means, what it costs, and when you'd
reach for a remote proof server instead.

!!! abstract "Native Rust, not WebAssembly"

    Kuira's prover is the same Rust proving engine the Midnight proof server
    uses (`midnight-zkir`), compiled to a native `.so` and called over
    JNI. It is **not** the WebAssembly prover used by Midnight's reference
    wallet. Running as native machine code is what makes proving the full
    wallet flow on-device practical without offloading to a server.

---

## On-device vs. remote — the toggle

Proving mode is a single setting, `ProvingMode`, defaulting to `LOCAL`:

| Mode | Where the proof is computed | Network | Keys |
|------|------------------------------|---------|------|
| `LOCAL` *(default)* | On the device, in native Rust | None | Cached proving keys (see below) |
| `REMOTE` | A proof server over HTTP | Yes | Held by the server |

The wallet panel surfaces this as **on-device** vs **remote**. In `LOCAL`
mode the unproven transaction is built on-device, proved on-device, and
submitted — nothing private is sent anywhere to be proven. In `REMOTE` mode
the unproven transaction is sent to a proof server (default
`http://localhost:6300`) which returns the proof.

`LOCAL` requires the proving keys to be present on the device; if they aren't,
proving fails with a clear error rather than silently falling back to a
server. Provision the keys once (see [Proving keys](#proving-keys)) before
relying on `LOCAL`.

```kotlin
import com.midnight.kuira.core.compact.proving.ProvingMode

// LOCAL is the default — no configuration needed.
val sdk = MidnightSdk.Builder(context)
    .network(MidnightNetwork.PREPROD)
    .seed(seed)
    .build()

// Opt into a remote proof server instead:
val sdk = MidnightSdk.Builder(context)
    .network(MidnightNetwork.PREPROD)
    .seed(seed)
    .provingMode(ProvingMode.REMOTE)
    .proofServerUrl("http://10.0.2.2:6300")
    .build()
```

---

## The proof system

Midnight proofs are a **PLONK proof system with KZG polynomial commitments**
over the **BLS12-381** curve (with **JubJub** as the embedded curve for
in-circuit elliptic-curve operations). The implementation is Midnight's
`midnight-proofs` / `midnight-circuits` stack, which began as a fork of PSE's
`halo2` v0.3.0 and has since diverged.[^proofs]

This matters for one practical reason: **proving cost is governed by circuit
size**, and circuit size is expressed as a single parameter, `k`.

---

## Circuit size: the `k` parameter

A circuit has exactly **2^k rows** — `k` is the base-2 logarithm of the row
count.[^halo2-rows] So:

| k | Rows (2^k) |
|---|-----------|
| 13 | 8,192 |
| 14 | 16,384 |
| 15 | 32,768 |
| 16 | 65,536 |

**Cost scales with `k`.** Proving is dominated by FFTs (`O(n log n)`) and a
multi-scalar multiplication over `n = 2^k` rows, so proving time grows roughly
as `O(2^k · k)` and prover memory grows **roughly linearly in 2^k**. The rule
of thumb: **each `+1` in `k` roughly doubles both proving time and memory.**

Kuira's wallet circuits and the `k` they use:

| Circuit | k | Rows | SRS file |
|---------|---|------|----------|
| Dust spend | 13 | 8,192 | `bls_midnight_2p13` |
| ZSwap output | 14 | 16,384 | `bls_midnight_2p14` |
| ZSwap spend | 15 | 32,768 | `bls_midnight_2p15` |

The on-device prover loads the structured reference string (SRS) matching each
circuit's `k`. Kuira's wallet circuits top out at **k = 15**; larger SRS sizes
exist in the upstream catalog but Kuira neither provisions them nor proves
circuits that need them.

!!! warning "The on-device prover refuses circuits above `k = 15`"

    A circuit past a certain size does not fail on a phone — it takes the phone down. Measurements on a Galaxy S10 put `k = 18` at roughly 81 seconds and 3.4 GB, and `k = 19` reproducibly trips the kernel watchdog and reboots the device, which an app cannot catch, report, or recover from.[^ceiling] So the prover refuses anything above `k = 15` with an error naming the size it needed, rather than attempting it.

    That ceiling matches the parameters Kuira provisions, so nothing you can reach today is refused. It is enforced independently of which parameter files happen to be present, so adding a larger one cannot quietly re-open that path.

    A circuit too large to prove locally is not stuck: switch that flow to a remote proof server, or shrink the circuit — `transientHash` is the usual lever (see below).

[^ceiling]: Measured by Webisoft on a Galaxy S10 (SM-G973W) and published in their `midnight-mobile` runtime.

---

## What it costs

Measured on a Galaxy Z Fold 7 (SM-F966U, Android 16), proving a ZSwap output — `k = 14`, the circuit a shielded receive uses:

| | |
|---|---|
| First proof in a process | ~3.5 s |
| Every proof after | ~2.6 s |
| Spread across runs | within 3% |
| Proof size added to the transaction | ~4.4 KB |

The first proof pays about a second of warm-up that later ones don't. Proving runs on a bounded thread pool sized to leave a core for the UI, so a proof does not freeze the screen.

Treat these as the fast end of the range, not a promise. A 2025 flagship is the ceiling; an older or mid-range handset will be slower, and a device whose screen is off may be slower still, because the performance cores park. Figures measured on an emulator are not a useful guide in either direction — they have been reported anywhere from 30 seconds to two minutes for work a real phone does in under three.

If a flow is too slow at the size you need, the lever is the circuit, not the device: see `transientHash` below.

---

## Keeping circuits small

Circuit size is the dial that sets both the cost and whether a proof runs on the device at all, and the cheapest way to turn it is to pick the right hash.

Compact offers two. `persistentHash` is the one that produces a value the ledger can store, and it costs roughly **4,167 rows** per hash. `transientHash` costs about **297 rows** — around fourteen times less — and is the right choice for any value that never reaches the ledger.

Merkle work is where this decides the outcome. In a depth-20 membership proof, only the root is ever written on chain; every node on the path between the leaf and the root exists solely to compute it. Hashing those with the persistent primitive puts the circuit near **91,000 rows — `k = 17`**, above the ceiling, so it will not prove on the device. The same circuit built on `transientHash` lands near **7,000 rows — `k = 13`**, comfortably inside it:

| Depth-20 membership proof | rows | `k` | proves on device |
|---|---|---|---|
| Built on `persistentHash` | ~91,000 | 17 | no |
| Built on `transientHash` | ~7,000 | 13 | yes |

Values cross back at the boundary, not throughout. A Merkle root or a nullifier that has to be stored or compared as `Bytes<32>` converts with `upgradeFromTransient`, and `degradeToTransient` converts the other way. Convert at the edge where the ledger is actually touched; converting in the middle of a path walk spends exactly the rows you were trying to save.

---

## Proving keys

On-device proving needs proving keys on the device. The wallet keys
(ZSwap + Dust circuits + shared BLS public parameters) total **~33 MB**. Each
circuit contributes a prover key, a verifier key, and a bytecode-IR file; the
BLS public parameters (`bls_midnight_2p{k}`, k = 5–15) are the KZG SRS shared
across circuits.

There are **two ways to provision them**; the SDK prefers whichever is present
(`ProvingKeyManager.ensureWalletKeysAvailable`, run during SDK bootstrap):

1. **Offline bundle — recommended for production.** Ship the wallet keys inside
   the APK so a fresh device never depends on the network. With the
   `io.github.kuiralabs.contract` Gradle plugin:

        kuiraContract { bundleWalletKeys = true }

    The `provisionWalletKeys` task downloads the version-pinned keys **once at
    build time** (cached per machine), and stages them into `assets/wallet-keys`;
    on device the SDK installs them with `installWalletKeysFromAssets`. Cost:
    ~33 MB of APK size. Keep the staged folder git-ignored — it's regenerated.

2. **Runtime download — the default.** If the keys aren't bundled, the SDK
   downloads them once from Midnight's key store on first bootstrap and caches
   them in internal storage. The first proof on a fresh install then waits on
   that one-time download (and fails on a flaky/absent network — which is why
   bundling is preferred for production).

dApp-specific **contract** circuits are a separate, much smaller key set — built
by `compactc`, bundled in your APK under `assets/keys`, and installed with
`installCircuitKeysFromAssets` (see the integration guide). The shared BLS set
above covers small contract circuits too, so you don't bundle BLS per contract.

---

## Performance & benchmarks

[What it costs](#what-it-costs) above gives Kuira's own measured figures. This section is about everything *else* you will find while reading around, because most of it does not describe on-device Midnight proving at all.

**Midnight publishes no official proving wall-clock or memory benchmarks.**
The `midnight-zk` and `midnight-wallet` repositories ship runnable benchmark
*harnesses* (Criterion), but no recorded result figures, and the
`midnight-wallet` repo and issues contain no proving-time or proving-memory
numbers.[^bench] Any mobile-ZK timing figures you find via web search are from
**other proof systems** (e.g. STARK-based provers) and must not be attributed
to Midnight.

Two things to keep straight when reading around:

- The large memory figures discussed in `midnight-wallet` issues (e.g. tens to
  hundreds of GB) are **chain-sync** memory in the WASM stack, **not** proof
  generation, and not applicable to Kuira's native path.[^sync-mem]
- The only published latency figures associated with Midnight describe the
  **remote proof server** ("seconds to a few minutes" for complex shielded
  transactions), which is a server characteristic — do not read it as the
  on-device number.

For a number on *your* target hardware, measure it rather than extrapolating from ours: run a representative transaction in `LOCAL` mode on the device and time it — the native prover logs its own wall-clock duration per proof — or run the Criterion benches in `midnight-zk` for per-circuit figures. Measure on the oldest handset you intend to support, not the newest; that is the number your users feel. The cost model above — time `≈ O(2^k log 2^k)`, memory roughly linear in `2^k` — tells you how a figure moves as the circuit grows.

---

## When to use which

- **Default to `LOCAL`.** It's private (inputs never leave the phone), works
  offline, and avoids a network round-trip. This is the point of the SDK.
- **Reach for `REMOTE`** only if proving a large or complex transaction on a
  low-end device is too slow for your UX, or the circuit is above `k = 15` and
  the device prover therefore refuses it. Midnight's own wallet design proposes
  routing by circuit size for the same reason — small circuits client-side,
  large ones to a remote proof server — though it leaves the threshold
  undefined.[^routing] Kuira's refusal point is a safety limit, not that
  threshold: a circuit can be well worth offloading long before it reaches it.
- Either way, the balance-and-submit flow reports a proving stage through the
  SDK's progress callbacks, so the wait is visible to the user rather than an
  opaque hang.

---

[^proofs]: `midnight-proofs` — "Implementation of Plonk proof system with KZG
    commitments. This repo initially started as a fork of `halo2` v0.3.0 …"
    <https://github.com/midnightntwrk/midnight-zk/blob/main/proofs/README.md>

[^halo2-rows]: Rows form a multiplicative subgroup used for the FFT, so the row
    count must be a power of two; `k` is the `2^k` bound on rows.
    <https://zcash.github.io/halo2/concepts/arithmetization.html> ·
    <https://zcash.github.io/halo2/user/dev-tools.html>

[^routing]: midnight-wallet issue #296, "Dynamic Proof Backend Selection":
    "use zkir metadata (K-value) to automatically route proof requests …
    client-side WASM for low-K circuits, remote TEE-based proof server for
    high-K circuits" — with the routing threshold marked "TBC".
    <https://github.com/midnightntwrk/midnight-wallet/issues/296>

[^bench]: `midnight-zk` ships Criterion benches (e.g. `proofs/benches/plonk.rs`
    sweeping k = 8…16) but no checked-in result data.
    <https://github.com/midnightntwrk/midnight-zk/tree/main/proofs/benches>

[^sync-mem]: midnight-wallet issue #434 ("Memory running out of band") reports
    high memory during **sync**, not proving.
    <https://github.com/midnightntwrk/midnight-wallet/issues/434>
