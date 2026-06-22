---
title: Prerequisites
---

# Prerequisites

Everything you need installed before the [Quickstart](quickstart.md) or the [integration guide](integration.md). Install these once, in order; each row has a one-line check so you know it worked.

!!! tip "New to Android development?"
    If you've never built an Android app, get comfortable with Android Studio, the SDK, creating an emulator, and running an app first — **[developer.android.com/get-started](https://developer.android.com/get-started/overview)**. The rest of these docs assume you can build and run a basic Android app.

## Toolchain

| Tool | Version | Why | Check |
|---|---|---|---|
| **JDK** | 17 | SDK `sourceCompatibility` / `jvmTarget` | `java -version` → `17.x` |
| **Android Studio** | latest stable | IDE, SDK manager, emulator | Help → About |
| **Android SDK** | compileSdk 36, **minSdk 30** | the SDK requires `minSdk 30` (Block Store + Credential Manager) | SDK Manager |
| **Docker Desktop** | running | the localnet stack (node + indexer + proof server) | `docker info` (no error) |
| **Node.js** | 20+ | runs the `mn` Midnight CLI | `node -v` → `v20+` |
| **`mn` CLI** | latest | airdrop + localnet control | `npm i -g midnight-wallet-cli` → `mn --version` |
| **Compact toolchain** | compactc `{{ compactc_version }}` | compile `.compact` contracts | `compact --version` |

!!! note "You do NOT need the Android NDK"
    The SDK ships prebuilt native libraries (`arm64-v8a` + `x86_64`). You don't compile any native code, so there's no NDK step — don't go install one.

## Pinned stack (tested together)

| Layer | Version |
|---|---|
| Kuira SDK | `{{ kuira_version }}` |
| Kuira contract plugin | `{{ kuira_contract_plugin_version }}` |
| midnight-node (localnet) | `0.22.5` — on-chain Compact runtime `{{ compact_runtime_version }}` |
| compactc / language / runtime | `{{ compactc_version }}` / `{{ compact_language_version }}` / `{{ compact_runtime_version }}` |

!!! warning "Node version matters"
    `midnight-node:0.22.5` ships on-chain Compact runtime `{{ compact_runtime_version }}` — the runtime your contract targets. Older nodes (`≤ 0.22.3`) run `0.15.0` and **reject** a contract compiled for `{{ compact_runtime_version }}` with a runtime-version error. `mn localnet up` pulls the right image; if you run the Docker stack by hand, pin the node tag to `0.22.5`.

## Emulator or device

=== "Emulator"
    Any **arm64** or **x86_64** AVD works on SDK `{{ kuira_version }}`+ — the native library ships both ABIs.

    !!! warning "x86_64 emulators need alpha04+"
        On `alpha03` and earlier the native lib is `arm64-v8a` only, so an x86_64 (Intel-host) AVD fails at launch with `java.lang.UnsatisfiedLinkError`. Use `{{ kuira_version }}`+, or create an `arm64-v8a` AVD.

=== "Physical device"
    Enable Developer Options → USB debugging, then forward the localnet ports to the phone:
    ```bash
    adb reverse tcp:9944 tcp:9944   # node RPC
    adb reverse tcp:8088 tcp:8088   # indexer
    adb reverse tcp:6300 tcp:6300   # proof server
    ```
    (Or apply the `io.github.kuiralabs.localnet` Gradle plugin, which does this for you.)

    !!! tip "SIM-less phone with no 'Install via USB'?"
        Push and install the APK directly:
        ```bash
        ./gradlew :app:assembleDebug
        adb push app/build/outputs/apk/debug/app-debug.apk /data/local/tmp/app.apk
        adb shell pm install -r /data/local/tmp/app.apk
        ```

## Operating-system notes

=== "macOS"
    Apple Silicon and Intel both work. Apple-Silicon emulators are `arm64`; Intel-host emulators are `x86_64` (needs alpha04+, above).

=== "Linux"
    Works. Make sure KVM is available for a hardware-accelerated emulator.

=== "Windows"
    `mn localnet up` can fail with `spawnSync … cmd.exe ETIMEDOUT`. Bring the stack up directly instead:
    ```bash
    docker compose -f ~/.midnight/localnet/compose.yml up -d
    ```
    The Compact toolchain is easiest under **WSL2**.

---

Next: **[Quickstart](quickstart.md)** — clone a working dApp and run it end-to-end.
