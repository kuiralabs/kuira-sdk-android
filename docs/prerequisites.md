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
| **JDK** | 17 | AGP 8.13 build toolchain (the SDK targets Java 11 bytecode) | `java -version` → `17.x` |
| **Android Studio** | latest stable | IDE, SDK manager, emulator | Help → About |
| **Android SDK** | compileSdk 36, **minSdk 30** | the SDK requires `minSdk 30` (Block Store + Credential Manager) | SDK Manager |
| **Docker Desktop** | running | the localnet stack (node + indexer + proof server) | `docker info` (no error) |
| **Node.js** | 20+ | runs the `mn` Midnight CLI | `node -v` → `v20+` |
| **`mn` CLI** | latest | airdrop + localnet control | `npm i -g midnight-wallet-cli` → `mn --version` |
| **Compact toolchain** | compactc `{{ compactc_version }}` | compile `.compact` contracts | `compact --version` |

!!! note "You do NOT need the Android NDK"
    The SDK ships prebuilt native libraries (`arm64-v8a` + `x86_64`). You don't compile any native code, so there's no NDK step — don't go install one.

## Install and configure `mn`

```bash
npm i -g midnight-wallet-cli
mn --version                                 # 0.4.1 or newer
```

!!! warning "Match the package name exactly"
    `midnight-wallet-cli` is community-maintained ([nel349/midnight-wallet-cli](https://github.com/nel349/midnight-wallet-cli), Apache-2.0) and is **not** published under the `@midnight-ntwrk` scope. The unrelated npm package named `midnight-cli` gives you no `mn` command at all.

Point `mn` at the indexer's **full GraphQL path** before you fund anything. The root port on its own returns HTTP 404, and an airdrop issued against a misconfigured indexer fails too — so this is a funding prerequisite, not a convenience:

```bash
mn config set network undeployed
mn config set indexer-ws ws://127.0.0.1:8088/api/v4/graphql/ws
```

!!! note "Endpoint keys are scoped to the network selected when you set them"
    `mn config set` stores an endpoint against whichever `network` is currently selected. Set `network` first, and re-set the endpoint for every network you use.

### Confirm the stack is really up

`mn localnet status` can report a healthy stack whose ports aren't actually reachable, so probe them yourself before blaming the app — `9944` node, `8088` indexer, `6300` proof server:

```bash
docker ps                                    # node, indexer, proof-server healthy
nc -z 127.0.0.1 9944 && nc -z 127.0.0.1 8088 && nc -z 127.0.0.1 6300 \
  && echo "node / indexer / proof-server reachable"
```

## Pinned stack (tested together)

| Layer | Version |
|---|---|
| Kuira SDK | `{{ kuira_version }}` |
| Kuira contract plugin | `{{ kuira_contract_plugin_version }}` |
| midnight-node (localnet) | `0.22.5` — on-chain Compact runtime `{{ compact_runtime_version }}` |
| compactc / language / runtime | `{{ compactc_version }}` / `{{ compact_language_version }}` / `{{ compact_runtime_version }}` |

!!! warning "Node version matters"
    `midnight-node:0.22.5` ships on-chain Compact runtime `{{ compact_runtime_version }}` — the runtime your contract targets. Older nodes (`≤ 0.22.3`) run `0.15.0` and **reject** a contract compiled for `{{ compact_runtime_version }}` with a runtime-version error. `mn localnet up` pulls the right image; if you run the Docker stack by hand, pin the node tag to `0.22.5`.

## Targeting PreProd

Localnet and Preview need nothing beyond the toolchain above. **PreProd needs a [Blockfrost](https://blockfrost.io) project id of your own** — its original indexer was decommissioned on 2026-10-09 and the replacement authenticates every request, so a dApp without one reads nothing on PreProd. Create a PreProd project (the id starts with `nightpreprod`), put it in **your app's** gitignored `local.properties`, and check it with `./gradlew :app:kuiraDoctor`:

```properties
kuira.blockfrost.projectId=nightpreprod...
```

Full setup, including how a shipped app can supply the id at runtime instead, is in the [Integration guide](integration.md).

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
    The Compact toolchain is easiest under **WSL2**. On a minimal WSL2 image `compact update` fails to extract the compiler and leaves no default compiler set, because the installer shells out to extraction utilities the image doesn't ship:
    ```bash
    sudo apt install -y unzip tar gzip curl
    compact update
    compact compile --version                # expect {{ compactc_version }}
    ```

    From PowerShell, `Test-NetConnection -ComputerName 127.0.0.1 -Port 9944` is the port check.

---

Next: **[Quickstart](quickstart.md)** — clone a working dApp and run it end-to-end.
