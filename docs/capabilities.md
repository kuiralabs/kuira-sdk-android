---
title: Capabilities
---

# Capabilities

What you can build with Kuira, split two ways: what your **users** get
from an app built on it, and what you get as the **developer** building
it.

!!! abstract "Built on a native Rust core — not a WASM sandbox"

    The cryptographic core — wallet, ledger, Dust, and **zero-knowledge
    proving** — is a native Rust library compiled straight to an Android
    `.so` and called over JNI. It runs as native ARM64 machine code, not
    the Midnight stack's WebAssembly modules inside an embedded runtime.
    That's the foundation that makes [on-device proving](on-device-proving.md)
    viable.

    *(Compact contract logic itself executes in a QuickJS runtime; the
    claim here is about the crypto/proving core, not contract execution.)*

---

## For your users

Benefit-first — the capabilities your app can offer the people using it.

<div class="grid cards" markdown>

-   :material-shield-lock:{ .lg .middle } __Your data never leaves the phone__

    ---

    Zero-knowledge proofs are generated **on-device, offline** — there is
    no proof server in the loop. Nothing private is sent anywhere to be
    proven.

-   :material-wallet:{ .lg .middle } __A wallet with no custodian__

    ---

    The wallet lives inside your app, not behind a separate wallet app or
    a hosted service. Full shielded + unshielded balances and Dust, with
    nobody holding the keys but the user.

-   :material-fingerprint:{ .lg .middle } __Sign up with one tap, no seed phrase__

    ---

    A single biometric mints the user's identity and wallet. No 24-word
    phrase to write down at onboarding *(passkey-derived under the hood)*.

-   :material-cellphone-arrow-down:{ .lg .middle } __Move to a new phone without losing the wallet__

    ---

    Recovery rides the user's synced passkey + biometric — reinstall or
    switch devices and the wallet comes back *(encrypted device-transfer
    backup under the hood)*.

-   :material-cloud-sync:{ .lg .middle } __Wallet data follows you across devices__

    ---

    The wallet's sync state is backed up encrypted to the user's own cloud
    storage and restored on a new device, so it's ready in seconds instead
    of re-scanning the whole chain *(opt-in; the data is encrypted on-device
    before upload — the cloud only ever holds ciphertext)*.

-   :material-swap-horizontal:{ .lg .middle } __Testnet to mainnet, same code__

    ---

    Point the app at undeployed, preview, preprod, or mainnet by
    configuration — no code change to move between networks.

</div>

---

## For you, the developer

The DevX side — wired so you write app logic, not plumbing.

<div class="grid cards" markdown>

-   :material-package-variant-closed:{ .lg .middle } __One Gradle line, whole SDK__

    ---

    `implementation("io.github.kuiralabs:dapp-ui:{{ kuira_version }}")`
    `api`-exposes the full module graph. Need headless? Drop to
    `midnight-sdk`.

-   :material-robot:{ .lg .middle } __Agent-paired recipes__

    ---

    Every recipe is a stable-URL markdown file with a one-tap prompt for
    your coding agent, indexed by a site-root [`/llms.txt`](llms.txt).

-   :material-stethoscope:{ .lg .middle } __`kuiraDoctor` preflight__

    ---

    Environment misconfig — unreachable `assetlinks.json`, runtime-pin
    mismatch, missing debug-cleartext — fails at **build time** with a
    clear cause, instead of surfacing as a runtime crash.

-   :material-cog-sync:{ .lg .middle } __Contract Gradle plugin__

    ---

    `io.github.kuiralabs.contract` syncs compiled `.compact` artifacts into
    assets, validates the source, and enforces the runtime-version pin.

-   :material-progress-clock:{ .lg .middle } __Progress callbacks__

    ---

    Balance + submit report through six discrete stages, so the
    otherwise-opaque proving/submission wait becomes real UX.

-   :material-table-check:{ .lg .middle } __Lossless typed ledger reads__

    ---

    `MidnightContract.ledger()` returns typed, validated accessors with
    loud failures — no silent misdecode of zero-valued vector cells.

-   :material-check-decagram:{ .lg .middle } __Auditable & modern-Android ready__

    ---

    Source jars ship beside every AAR on Maven Central; native libraries
    are 16 KB-page aligned for Android 15+ / Play readiness.

</div>

---

See the [integration guide](integration.md) to wire it up, the
[cookbook](recipes/index.md) for task-by-task recipes, and the
[roadmap](roadmap.md) for where the SDK is headed.
