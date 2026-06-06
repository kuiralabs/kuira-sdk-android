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
    uses (`midnight-zkir`), compiled to a native ARM64 `.so` and called over
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
// LOCAL is the default — no configuration needed.
val sdk = MidnightSdk.Builder(context)
    .network(MidnightNetwork.PREPROD)
    .build(seed)

// Opt into a remote proof server instead:
val sdk = MidnightSdk.Builder(context)
    .network(MidnightNetwork.PREPROD)
    .provingMode(ProvingMode.REMOTE)
    .proofServerUrl("http://10.0.2.2:6300")
    .build(seed)
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
exist in the upstream catalog but Kuira does not provision them.

!!! note "There is no fixed `k` cutoff for on-device proving"

    Midnight's own wallet design proposes routing proofs by circuit size —
    small (low-`k`) circuits proved client-side, large (high-`k`) circuits
    sent to a remote TEE proof server — but the threshold is explicitly
    left **undefined ("TBC")**.[^routing] In Kuira, `k` is a per-circuit
    property (13–15 for the wallet), not a global on/off switch, and the
    on-device path proves all of them. Treat `k` as the dial that tells you
    *how expensive* a given circuit is, not a hard line between local and
    remote.

---

## Proving keys

On-device proving needs proving keys on the device. The wallet keys
(ZSwap + Dust circuits + shared BLS public parameters) total **~24 MB**, are
downloaded once from Midnight's key store, and are cached in the app's
internal storage. Each circuit contributes a prover key, a verifier key, and a
bytecode-IR file; the BLS public parameters (`bls_midnight_2p{k}`) are the KZG
SRS shared across circuits.

Provisioning happens during SDK bootstrap, so the first proof on a fresh
install waits on the one-time download; subsequent proofs use the cache.
dApp-specific contract circuits are bundled in your APK assets and installed
separately from the wallet keys.

---

## Performance & benchmarks

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

For a real number on your target hardware, **measure it**: run a representative
transaction in `LOCAL` mode on the device and time it (the native prover logs
its own wall-clock duration per proof), or run the Criterion benches in
`midnight-zk` for per-circuit figures. The cost model above — time `≈ O(2^k log
2^k)`, memory roughly linear in `2^k` — is the reliable guide until you have
device measurements.

---

## When to use which

- **Default to `LOCAL`.** It's private (inputs never leave the phone), works
  offline, and avoids a network round-trip. This is the point of the SDK.
- **Reach for `REMOTE`** only if proving a large/complex transaction on a
  low-end device is too slow for your UX, or you're proving circuits well
  beyond the wallet's `k = 15` and want to offload the cost.
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
