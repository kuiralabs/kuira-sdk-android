---
title: Capabilities
---

# Capabilities

What you can build with Kuira, split two ways: what your **users** get from an app built on it, and what you get as the **developer** building it.

!!! abstract "Built on a native Rust core, not a WASM sandbox"

    The cryptographic core (wallet, ledger, Dust, and **zero-knowledge proving**) is a native Rust library compiled straight to an Android `.so` and called over JNI. It runs as native machine code, not as the Midnight stack's WebAssembly modules inside an embedded runtime. That foundation is what makes [on-device proving](on-device-proving.md) viable.

    *(Compact contract logic itself executes in a QuickJS runtime; this claim covers the crypto and proving core, not contract execution.)*

---

## For your users

The capabilities your app can offer the people who use it.

<div class="grid cards" markdown>

-   :material-shield-lock:{ .lg .middle } __Your data never leaves the phone__

    ---

    Zero-knowledge proofs are generated **on-device, offline**, with no proof server in the loop. Nothing private is sent anywhere to be proven.

-   :material-wallet:{ .lg .middle } __A wallet with no custodian__

    ---

    The wallet lives inside your app, not behind a separate wallet app or a hosted service. It holds full shielded and unshielded balances and Dust, and nobody holds the keys but the user.

-   :material-fingerprint:{ .lg .middle } __Sign up with one tap, no seed phrase__

    ---

    A single biometric mints the user's identity and wallet. There is no 24-word phrase to write down at onboarding (the identity is derived from a passkey).

-   :material-cellphone-arrow-down:{ .lg .middle } __Move to a new phone without losing the wallet__

    ---

    Recovery uses the user's synced passkey and biometric: reinstall or switch devices and the wallet comes back (through an encrypted device-transfer backup).

-   :material-key-variant:{ .lg .middle } __A sovereign 24-word backup, if they want one__

    ---

    Beyond the automatic passkey recovery, the user can reveal a standard 24-word recovery phrase and restore the exact wallet on **any** device, with no passkey, account, or cloud involved. It is opt-in and one-way, shown once behind a biometric on a screenshot-blocked screen, with a clipboard that auto-clears.

-   :material-cloud-sync:{ .lg .middle } __Wallet data follows you across devices__

    ---

    The wallet's sync state is backed up, encrypted, to the user's own cloud storage and restored on a new device, so it's ready in seconds instead of re-scanning the whole chain. This is opt-in, and the data is encrypted on-device before upload, so the cloud only ever holds ciphertext.

-   :material-swap-horizontal:{ .lg .middle } __Testnet to mainnet, same code__

    ---

    Point the app at undeployed, preview, preprod, or mainnet through configuration. Moving between networks needs no code change.

-   :material-palette:{ .lg .middle } __A wallet that fits your app's look__

    ---

    Pick from built-in palettes (Monochrome, Paper, Catppuccin, Nord, Dracula, Tokyo Night, and Rosé Pine), and the choice persists across restarts.

-   :material-bell-ring:{ .lg .middle } __Know the moment they're paid__

    ---

    Background notifications fire when NIGHT lands and show the real per-transaction amount, with no false "change" alerts.

</div>

---

## For you, the developer

The developer experience: the SDK handles the plumbing so you write app logic.

<div class="grid cards" markdown>

-   :material-package-variant-closed:{ .lg .middle } __One Gradle line, whole SDK__

    ---

    `implementation("io.github.kuiralabs:dapp-ui:{{ kuira_version }}")` `api`-exposes the full module graph. For a headless setup, use `midnight-sdk` instead.

-   :material-robot:{ .lg .middle } __Agent-paired recipes__

    ---

    Every recipe is a stable-URL Markdown file with a one-tap prompt for your coding agent, indexed by a site-root [`/llms.txt`](llms.txt).

-   :material-stethoscope:{ .lg .middle } __`kuiraDoctor` preflight__

    ---

    Environment misconfigurations (an unreachable `assetlinks.json`, a runtime-pin mismatch, or missing debug cleartext) fail at **build time** with a clear cause, instead of surfacing as a runtime crash.

-   :material-cog-sync:{ .lg .middle } __Typed contract API, generated__

    ---

    `io.github.kuiralabs.contract` reads your compiled contract's `contract-info.json` and generates a typed `<Name>Contract` facade, with typed `call` / `read` / `local` methods that carry your circuit's real argument and return types (`BigInteger`, `ByteArray`, generated `data class`es, and `enum`s). A wrong argument type becomes a **compile error** instead of a device failure, and `Uint` arguments are range-checked to their declared width. The plugin also syncs the `.compact` artifacts into assets and pins the runtime version.

-   :material-progress-clock:{ .lg .middle } __Progress callbacks__

    ---

    Balance and submit report through five discrete stages (fetching state, executing, proving, balancing, and submitting), so you can show real progress during the proving and submission wait.

-   :material-table-check:{ .lg .middle } __Typed ledger snapshot__

    ---

    The generated facade's `ledger()` returns a typed `<Name>Ledger` snapshot: a `val` per exported on-chain field, decoded and range-checked, with loud failures instead of silent misdecodes. `observeLedger()` gives the same view reactively, on every state change.

-   :material-check-decagram:{ .lg .middle } __Auditable & modern-Android ready__

    ---

    Source jars ship beside every AAR on Maven Central, and native libraries are 16 KB-page aligned for Android 15+ and Play readiness.

-   :material-drag-variant:{ .lg .middle } __Drop-in floating wallet & sigil pills__

    ---

    `PanelBar(floating = true)` gives you draggable wallet and sigil chips that dock to a screen edge as peek tabs and resize on long-press: a movable wallet and identity surface with no custom UI to build.

</div>

---

See the [integration guide](integration.md) to wire it up, the [cookbook](recipes/index.md) for task-by-task recipes, and the [roadmap](roadmap.md) for where the SDK is headed.
