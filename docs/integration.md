# Kuira SDK integration guide

**Alpha: `{{ kuira_version }}`**

Build a Midnight zero-knowledge dApp on Android by adding **one dependency**, declaring your **own passkey domain**, and hosting **one small JSON file** on it.

This guide walks the recipe end to end. Two **public** reference apps consume the SDK exactly as described below, so you can clone either and read along:

- **[Kuira Starter](https://github.com/kuiralabs/kuira-starter-android)**: the minimal counter dApp, with sigil identity, a wallet, and a one-circuit Compact contract. Clone it, set your `applicationId` and `rpId`, and run it. It is also a GitHub template.
- **[BBoard](https://github.com/kuiralabs/example-bboard-android)**: a shared on-chain bulletin board (post and take down) that shows the deploy → call → read flow.

The snippets below come from those apps. When in doubt, the linked source is the ground truth.

---

## What the SDK gives you

Adding the one line below brings:

- **Sigil identity**: a passkey-derived DID (`did:key` + Ed25519). One biometric, no recovery phrase, and no maintainer dependency. It is backed up to Google Block Store, encrypted with a key you can't read.
- **Wallet**: a Midnight HD wallet (unshielded and shielded NIGHT, Dust gas) with live balance, send, receive, and a drop-in Compose **wallet panel** if you want it.
- **Contract surface**: deploy, call, and read state on any `.compact` contract. ZK proof generation runs on-device, with no proof-server hop required.
- **Indexer and chain client**: block, state, and event subscription, backed by Midnight's official indexer.
- **App-state cloud backup**: your dApp's per-user data rides the sigil's Block Store backup automatically. The backup blob is PRF-encrypted client-side before Google's Block Store touches it.

Drop in the prebuilt UI, build your own on the same contracts, or go fully headless. See [Choose your level](#choose-your-level) below.

---

## 1. Prerequisites

| | |
|---|---|
| Android Gradle Plugin | **≥ 8.13** (matches the SDK build) |
| Kotlin | **≥ 2.3** |
| `compileSdk` | 35+ |
| `minSdk` | **30**, required (the SDK uses keystore APIs added in API 30: biometric ⊕ device-credential) |
| Hilt + KSP | Required. The SDK is Hilt-first, so your app applies both. |
| A web domain you control | Required for the passkey relying party (GitHub Pages is fine for dev) |
| Your app's signing-cert SHA-256 | Needed for `assetlinks.json` (step 4) |

For the full toolchain (JDK 17, Android Studio, Docker, Node 20+, the `mn` CLI, and compactc), see **[Prerequisites](prerequisites.md)**.

---

## 2. Add the dependency

### Choose your level

Pick the dependency that matches how much of the UI you want Kuira to provide:

- **Drop in the prebuilt UI**: `io.github.kuiralabs:dapp-ui`. Ready-made, themeable Compose components (the **wallet pill**, the **sigil pill**, and the **Settings panel** for network, recovery phrase, lock, and sign-out), all in one `PanelBar`. They are wired to SDK state out of the box with safe security defaults: `FLAG_SECURE`, biometric gates, and an auto-clearing clipboard. Restyle them with a colors object; you write no wallet logic. This is the fastest path. See [Set up Sigil identity](recipes/set-up-sigil-identity.md).
- **Build your own experience**: also `dapp-ui` (its ViewModels) or `midnight-sdk`. Render your own screens on the same public contracts the pills are built on: `WalletRecovery`, `WalletPanelViewModel`, `SigilPanelViewModel` / `SigilSession`, `MidnightContract`, and `MidnightSdk`. The SDK keeps the hard parts (crypto, secure vault, on-device proving, sync, and session lock), and the screens are yours. Every bundled component is the first consumer of a contract you can call directly, for example [Reveal & restore the recovery phrase](recipes/reveal-and-restore-the-recovery-phrase.md).
- **Go headless**: `io.github.kuiralabs:midnight-sdk`. The full wallet, identity, and contract surface with **no Compose** pulled in; you build the UI layer top to bottom. See [§ 7 Going headless](#7-going-headless-no-panel).

!!! note "Theming today, more tuning coming"
    The prebuilt components expose theming now, plus a small set of behavioral knobs. Richer per-component tuning hooks are on the roadmap. Until a knob exists, the build-your-own path gives full control of that surface, because the contracts carry no UI policy.

Maven Central is already in every Android project's defaults, so there's no repository config to add. In `app/build.gradle.kts`:

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")          // only if your own UI is Compose
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
}

android {
    namespace = "com.example.mydapp"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.example.mydapp"
        minSdk = 30
        targetSdk = 36
    }
}

dependencies {
    // ── Pick ONE Kuira entry (see "Choose your level" above) ──
    //
    // Prebuilt pills + the ViewModels behind them (Compose). Drop the wallet
    // and sigil panels in as-is, OR build your own UI on the same contracts.
    implementation("io.github.kuiralabs:dapp-ui:{{ kuira_version }}")
    //
    // OR: headless core, no Compose pulled in. For dApps building the whole
    // UI layer top-to-bottom.
    // implementation("io.github.kuiralabs:midnight-sdk:{{ kuira_version }}")

    // Hilt processor (required: the SDK is Hilt-first)
    ksp("com.google.dagger:hilt-compiler:2.58")

    // your own app code, your own Compose deps, etc.
}
```

That single Kuira line brings the whole consumer surface onto your compile classpath transitively: passkey, sigil, wallet, ZK proving, contract deploy and call, indexer, and panel UI (if you picked `dapp-ui`). You don't redeclare individual modules.

---

## 3. Declare your passkey domain

The SDK deliberately provides **no default `PasskeyConfig`**. A passkey is bound to a domain, and that domain must be **yours**. If the SDK baked in a default, every consumer would silently route through the maintainer's domain, and PRF would only work after the maintainer added them to a maintainer-hosted `assetlinks.json`. The "open" SDK would then be permissioned.

Add a small Hilt module (anywhere in your `di/`):

```kotlin
package com.example.mydapp.di

import com.midnight.kuira.core.identity.passkey.PasskeyConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object IdentityConfigModule {

    @Provides
    @Singleton
    fun providePasskeyConfig() = PasskeyConfig(
        rpId   = "mydapp.example.com",   // YOUR domain (matches assetlinks.json below)
        rpName = "My dApp",              // shown in the biometric prompt
    )
}
```

> If you forget this, you get a clear Dagger missing-binding error at build time. This is intentional: it forces you to declare your domain before shipping.

---

## 4. Host `assetlinks.json` on your domain

Android's `CredentialManager` checks Digital Asset Links to verify that your app may use passkeys for your domain. Place this file at:

```
https://<your-domain>/.well-known/assetlinks.json
```

```json
[{
  "relation": [
    "delegate_permission/common.get_login_creds",
    "delegate_permission/common.handle_all_urls"
  ],
  "target": {
    "namespace": "android_app",
    "package_name": "com.example.mydapp",
    "sha256_cert_fingerprints": ["AB:CD:EF:01:23:45:67:89:..."]
  }
}]
```

**Get your cert SHA-256:**

```bash
keytool -list -v -keystore <your-keystore> -alias <your-alias> | grep SHA256
```
For debug builds, the default keystore is `~/.android/debug.keystore` (alias `androiddebugkey`, password `android`). Android Studio creates it on first run, so a command-line-only setup may not have one yet, and `signingReport` then reports it missing. Generate the standard debug keystore:

```bash
keytool -genkeypair -v -keystore ~/.android/debug.keystore \
  -storepass android -keypass android -alias androiddebugkey \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
```

> Without this file (or with a wrong package name or SHA-256), the biometric prompt fails and PRF can't derive your sigil. You host it once and update it only when you change signing certs.

---

## 5. Develop against a localnet

You don't need testnet tokens or a deployed contract to build. The **`UNDEPLOYED`** network is a full Midnight stack (node, indexer, and proof server) running locally in Docker. It is instant, free, and ephemeral, so you can reset it any time. It's the recommended loop for day-to-day development; switch to PREPROD only when you want the hosted chain.

!!! warning "PreProd's first sync replays from genesis, so set up cloud backup first"
    Localnet is instant. **PreProd is a long-lived chain with a large history**, so a wallet's first sync there replays from genesis, which takes minutes, not seconds. To make it a fast delta instead, set up [cloud backup](recipes/back-up-wallet-across-devices.md) **before** you switch to PreProd. It needs a one-time Google OAuth client (your app's package and signing SHA-1). Without it, cloud sync silently fails (`UNREGISTERED_ON_API_CONSOLE`) and PreProd replays from genesis on every fresh sync. The wallet still works; it is only slow.

!!! danger "PreProd needs your own Blockfrost project id; without one it does not work at all"
    PreProd's own indexer, `indexer.preprod.midnight.network`, was **decommissioned on 2026-10-09** and now answers HTTP 410. PreProd's indexer is served by [Blockfrost](https://blockfrost.io), which authenticates **every request**, so a dApp with no project id reads nothing on PreProd: no balance, no contract state, and no sync. Localnet and Preview are unaffected and need no credential.

    Create a **PreProd** project at [blockfrost.io](https://blockfrost.io) (its id starts with `nightpreprod`), then add it to **your app's** `local.properties`, which is gitignored so the credential never reaches version control:

    ```properties
    kuira.blockfrost.projectId=nightpreprod...
    ```

    The Kuira contract plugin turns that into a manifest placeholder and the SDK reads it at runtime; you write no code. An app that resolves its id elsewhere (a backend, remote config) can pass it directly instead:

    ```kotlin
    MidnightSdk.Builder(context)
        .network(MidnightNetwork.PREPROD)
        .blockfrostProjectId(idFromYourBackend)
        .seed(seed)
        .build()
    ```

    The id is **per developer and per app**. A Blockfrost project carries its own rate limit, so sharing one id shares one quota. Check your setup before you hit it at runtime:

    ```bash
    ./gradlew :app:kuiraDoctor
    ```

    `kuiraDoctor` verifies the id against the live endpoint and tells you which case you are in: none set, wrong network, or set-but-rejected.

### 5a. Start the localnet with the Midnight Wallet CLI (recommended)

The recommended way to run and fund a localnet is the **Midnight Wallet CLI** (`mn`), installed from npm as `midnight-wallet-cli`. It wraps the Docker stack and wallet funding behind a few commands:

```bash
# one-time; needs Docker running + Node 20+
npm install -g midnight-wallet-cli          # installs `midnight` (alias `mn`)

mn localnet up                              # start node + indexer + proof server (Docker)
mn localnet status                          # check it's healthy
# … develop …
mn localnet down                            # tear it down
```

!!! warning "Configure the indexer path before funding"
    `mn` needs the indexer's full GraphQL path (`ws://127.0.0.1:8088/api/v4/graphql/ws`). The root port returns 404, and the airdrop below fails against a misconfigured indexer. The one-time setup is in [Prerequisites](prerequisites.md#install-and-configure-mn).

!!! note "Tested localnet stack: pin the node to `0.22.5`"
    Tested localnet stack: `midnight-node:0.22.5` (on-chain Compact runtime 0.16.0). Older nodes (≤0.22.3) ship runtime 0.15.0 and reject a contract compiled for 0.16.0. `mn` pulls the node image; if you run Docker by hand, pin the node tag to `0.22.5`.

!!! warning "Windows: `mn localnet up` can time out"
    On Windows, `mn localnet up` can fail with `spawnSync … cmd.exe ETIMEDOUT`. Bring the stack up directly:

    ```bash
    docker compose -f ~/.midnight/localnet/compose.yml up -d
    ```

Fund the wallet your app shows (copy its address from the wallet panel's receive screen):

```bash
mn airdrop 10000 --wallet mn_addr_undeployed1… --network undeployed   # NIGHT for fees
```

You enable Dust (gas) for the app's embedded wallet **in-app**: tap **Register dust** in the wallet panel.

!!! note "`mn dust register` targets a named CLI wallet, not the app's wallet"
    `mn dust register --wallet <name>` needs a named wallet from `mn wallet generate`; it cannot target the app's embedded wallet address.

> Localnet is ephemeral: `mn localnet down` (or a Docker restart) wipes all state, including funded balances. Re-airdrop after each fresh `up`.

### 5b. Let the app reach the localnet

The SDK already maps `UNDEPLOYED` to the right host per device type (`NetworkConfig`):

- **Emulator**: `10.0.2.2` (the emulator's alias for your machine's `localhost`). Nothing to do.

  !!! note "Emulator ABI: x86_64 works on `0.1.0-alpha04`+"
      x86_64 (Intel) and arm64 emulators both work on `0.1.0-alpha04`+ (the native lib ships `arm64-v8a` and `x86_64`). On alpha03 and earlier the lib is arm64-only, so an x86_64 AVD fails at launch with `java.lang.UnsatisfiedLinkError`; use alpha04+ or an arm64 AVD.
- **Physical device**: `127.0.0.1`, so the three localnet ports must be tunnelled over the debug bridge. The SDK ships a Gradle plugin that does this automatically on every `installDebug`. Apply it once; it needs no configuration:

  ```kotlin
  // app/build.gradle.kts
  plugins {
      id("io.github.kuiralabs.localnet") version "<sdk-version>"
  }
  ```

  It registers an `adbReverseLocalnet` task wired ahead of `installDebug`, so deploying to a connected physical device forwards ports 9944 (node RPC), 8088 (indexer), and 6300 (proof server) for you. Emulators use `10.0.2.2` and are skipped automatically.

  The example apps apply it exactly this way. For a working reference, see [BBoard](https://github.com/kuiralabs/example-bboard-android/blob/main/app/build.gradle.kts) and the [starter](https://github.com/kuiralabs/kuira-starter-android/blob/main/app/build.gradle.kts).

  **Required for physical devices:** the app can't reach the localnet without these three port forwards. The plugin runs them for you on `installDebug`; run them by hand if you're not using the plugin:

  ```bash
  adb reverse tcp:9944 tcp:9944   # node RPC
  adb reverse tcp:8088 tcp:8088   # indexer
  adb reverse tcp:6300 tcp:6300   # proof server
  ```

  If your phone has no **Install via USB** option (some devices hide it), build and push the APK over `adb` instead:

  ```bash
  ./gradlew :app:assembleDebug
  adb push app/build/outputs/apk/debug/app-debug.apk /data/local/tmp/app.apk
  adb shell pm install -r /data/local/tmp/app.apk
  ```

### 5c. Allow cleartext to the localnet (debug only)

Production uses HTTPS. Localnet is plain HTTP, so declare cleartext **in a debug-only manifest** and release builds stay HTTPS-clean:

```xml
<!-- app/src/debug/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:usesCleartextTraffic="true" />
</manifest>
```

> Why debug-only: the SDK's release variants are HTTPS-clean and don't grant any cleartext allowance, so each app declares its own in a debug-only manifest and release stays cleartext-free.

---

## 6. Minimal "Hello World": deploy and call

Your `Application` is `@HiltAndroidApp`, and your activity is a Hilt-enabled **`FragmentActivity`**. `AppCompatActivity` is the usual choice, because the panel hosts a biometric prompt that needs a `FragmentActivity` host:

```kotlin
@HiltAndroidApp
class MyApp : Application()

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            Box(modifier = Modifier.fillMaxSize()) {
                MyDappScreen()  // your UI underneath

                // Drop-in combined sigil + wallet UI: a pair of draggable
                // floating chips that own their own state. The wallet pill
                // builds the SDK (one biometric) the first time it shows, and
                // owns network selection; its pick drives the SDK's durable
                // NetworkPreferenceStore, which your screen can follow.
                PanelBar(
                    floating = true,
                    network = selectedNetwork,
                    onNetworkChange = ::selectNetwork,
                )
            }
        }
    }
}
```

Every reference app uses this canonical integration. See [Set up Sigil identity](recipes/set-up-sigil-identity.md). The lower-level `SigilStatusPanel` and `WalletStatusPanel` are still available if you want to place each panel inline yourself.

Your dApp logic gets the SDK from the injected `MidnightSdkProvider`. Observe `sdkProvider.sdk` (a `StateFlow<MidnightSdk?>`, non-null once the wallet panel has bootstrapped) or suspend on `awaitSdk()`:

```kotlin
@HiltViewModel
class MyDappViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val sdkProvider: MidnightSdkProvider,
) : ViewModel() {

    fun deployAndCall() = viewModelScope.launch {
        val sdk = sdkProvider.awaitSdk()   // waits for the panel to bootstrap it

        // 1. Install your contract's proving keys (required before the first
        //    deploy/call (see §6.1), or proving fails.
        ProvingKeyManager(context).installCircuitKeysFromAssets()

        // 2. Build a write-capable handle. create() takes the SDK's config;
        //    contractJs is an InputStream from assets; deploy/call need the
        //    coin public key + each circuit's verifier-key bytes.
        val verifier = context.assets
            .open("keys/myCircuit.verifier").use { it.readBytes() }
        val contract = MidnightContract.create(sdk.config) {
            name = "mycontract"
            contractJs = context.assets.open("runtime/mycontract-contract.js")
            coinPublicKey = sdk.coinPublicKey
            circuitVerifierKeys = mapOf("myCircuit" to verifier)
        }

        // 3. Deploy, then call a circuit. `call(name, …args)` is stringly-typed;
        //    the contract Gradle plugin also generates a typed `MyContract`
        //    facade so `MyContract(contract).myCircuit()` is checked at compile
        //    time (see the deploy-and-call recipe).
        val address = contract.deploy().contractAddress
        contract.call("myCircuit")

        // 4. Read typed ledger state (lossless, no cell-hex parsing).
        val readOnly = MidnightContract.create(sdk.config) {
            contractJs = context.assets.open("runtime/mycontract-contract.js")
            this.address = address
        }
        val count = MyContract(readOnly).ledger().count   // typed facade; or untyped: readOnly.ledger().getUint64("count")
    }
}
```

### 6.1 Install your contract's proving keys (required)

ZK proofs run **on the device**, so every circuit your contract calls needs its proving keys and a BLS parameter set present **before the first deploy or call**. Otherwise the call fails at the proving step. Ship them in `assets/`. The recommended path is the `io.github.kuiralabs.contract` Gradle plugin (`{{ kuira_contract_plugin_version }}`), which stages the contract runtime and circuit keys into `assets/` for you. Without the plugin, use the hand-rolled `Copy` task shown in the [deploy-and-call recipe](recipes/deploy-and-call-a-compact-contract.md). Then install the keys at runtime. The install is idempotent, so call it before each action:

```kotlin
import com.midnight.kuira.core.compact.proving.ProvingKeyManager

// Discovers the circuit keys bundled in assets and stages them
// where the on-device prover looks.
ProvingKeyManager(context).installCircuitKeysFromAssets()
```

!!! note "Imports: use the `core.compact.proving` package"
    `ProvingKeyManager` and `ProvingMode` both live in `com.midnight.kuira.core.compact.proving`. There is a same-named `ProvingMode` typealias in `com.midnight.kuira.core.crypto.proving`. Do **not** import that one; always reference `com.midnight.kuira.core.compact.proving.ProvingMode`.

The shared **wallet** proving keys ship the full BLS parameter set (`bls_midnight_2p5`–`2p15`), so a small contract circuit (for example, a counter that needs `2p5`) finds the size it requires in the wallet keys. You do **not** bundle BLS per contract. Make sure the wallet keys are provisioned: SDK bootstrap provisions them, and you can ship them in the APK to skip the first-run download with `kuiraContract { bundleWalletKeys = true }` (see [On-device proving](on-device-proving.md)). The `CounterContract` in **[Kuira Starter](https://github.com/kuiralabs/kuira-starter-android)** shows the full pattern end to end.

> For a larger, multi-step contract (commit and reveal, witness packing, indexer-state polling, retry, and force-resync), the **[BBoard](https://github.com/kuiralabs/example-bboard-android)** reference app shows the deploy → call → read flow end to end.

---

## 7. Going headless (no panel)

If you don't want the Compose wallet panel, swap the dep:

```kotlin
implementation("io.github.kuiralabs:midnight-sdk:{{ kuira_version }}")  // no dapp-ui
```

You still own bootstrap and sigil forging: `MidnightSdkProvider.ensureSdk(...)` throws `SigilRequiredException` until a sigil exists. Forge it through `PasskeyManager` directly, or use the `SigilSession` helper.

`midnight-sdk` does not pull in Compose, so the headless entry stays small.

---

## 8. Shipping a release build

The starter ships `isMinifyEnabled = false` so newcomers see exactly what compiles. For a **production release**, turn on R8 and publish an **App Bundle**. Both matter a lot, because the SDK carries a native on-device ZK-proving core.

```kotlin title="app/build.gradle.kts"
android {
    buildTypes {
        release {
            isMinifyEnabled = true
            // The SDK ships its own consumer ProGuard rules, and AGP applies them automatically.
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
        }
    }
}
```

```bash
./gradlew :app:bundleRelease   # an .aab for Play, not a universal .apk
```

### What it costs in size

Measured on the counter starter (one small circuit):

| Build | Size | Why |
|---|---|---|
| Universal APK, minify **off** | ~152 MB | both ABIs + an unstripped dex (worst case, never shipped) |
| Universal APK, R8 **on** | ~93 MB | R8 strips the dex from ~65 MB → ~6 MB (most was SDK code your app never calls) |
| **Per-device** (App Bundle + R8) | **~60 MB** | Play delivers one ABI per device, not both |

A real release lands around **~60 MB per device**, comfortably inside [Google Play's 200 MB app-bundle limit](https://support.google.com/googleplay/android-developer/answer/9859372). The floor is the **native proving library** (~20–24 MB of Rust: the BLS/halo2 prover + QuickJS). R8 can't shrink it, because it's the cost of proving **on the device** rather than on a server. Bundling the wallet proving keys (`bundleWalletKeys = true`) adds ~33 MB on top; the default runtime download keeps them out of the binary.

!!! tip "Two settings do almost all the work"
    `isMinifyEnabled = true` (kills the dex bloat) + `bundleRelease` (one ABI per device). Everything after that is single-digit MB.

---

## Common pitfalls

| Symptom | Fix |
|---|---|
| Dagger: `PasskeyConfig cannot be provided without an @Provides-annotated method` | Step 3: declare your own `PasskeyConfig` module. |
| Runtime: `CLEARTEXT communication to 10.0.2.2 not permitted by network security policy` | Step 5: add the debug manifest. |
| Biometric prompt fails or PRF returns null | Step 4: `assetlinks.json` is missing, or the `package_name` or cert SHA-256 is wrong. |
| Contract call fails at the proving step, or `circuit keys not found`, or `BLS params` | §6.1: install your contract's proving keys before the first deploy or call, and make sure the wallet keys (which carry the BLS parameters) are provisioned. |
| App balance stays at 0 after an airdrop | The wallet's background subscription is live; check `adb logcat` for indexer connectivity. On localnet, state is ephemeral, so restarting the localnet wipes funds. |
| Balance stays 0 or shows **Loading…** on a **physical device** | Run the three `adb reverse` commands (9944 node, 8088 indexer, 6300 proof server) or apply the `io.github.kuiralabs.localnet` plugin (§5b). |
| `java.lang.UnsatisfiedLinkError` at launch on an x86_64 emulator | The native lib is arm64-only before `0.1.0-alpha04`. Upgrade to alpha04+ (ships `x86_64`) or use an arm64 AVD. |
| `Custom error: 168` or a dust-fee / time-to-dismiss failure on dust registration or the first tx | Fixed in SDK `0.1.0-alpha04`, so upgrade. An unexpected `Custom error: N` not in the known set usually means a client↔node ledger-version mismatch. Confirm your node is `0.22.5`. |
| `mn` fails with a WebSocket connection error, or the indexer returns HTTP 404 | The indexer WebSocket needs its full GraphQL path: `mn config set indexer-ws ws://127.0.0.1:8088/api/v4/graphql/ws` (run `mn config set network undeployed` first, because endpoint keys are per-network). See [Prerequisites](prerequisites.md#install-and-configure-mn). |
| The Gradle wrapper times out fetching `gradle-8.13-bin.zip` | The wrapper's `networkTimeout` is 10s, which a slow or proxied link exceeds even when the URL opens fine in a browser. Raise it to `networkTimeout=60000` in `gradle/wrapper/gradle-wrapper.properties`, or download the distribution once and point `distributionUrl` at a `file:///` path to your copy. |
| `Could not resolve io.github.kuiralabs:…` | Ensure `mavenCentral()` is in your repositories **and** the version is published. Check [central.sonatype.com/artifact/io.github.kuiralabs/dapp-ui](https://central.sonatype.com/artifact/io.github.kuiralabs/dapp-ui). |

---

## Known limitations (alpha)

The alpha has one known dependency you should be aware of. It doesn't block building, but it shapes what "alpha" means in practice and will change over time.

### Proving infrastructure downloads from a Midnight dev URL

On first launch, the SDK fetches Midnight's **protocol-level** proving assets (the universal BLS parameters and the wallet's shielded-spend and Dust circuit keys) from `https://midnight-s3-fileshare-dev-eu-west-1.s3.eu-west-1.amazonaws.com`. Midnight's own tooling uses the same bucket. It is **Midnight's bucket, not the SDK maintainer's**, and the URL is labeled `-dev-`. It has no production SLA.

**What this means in practice:**

- If that bucket is retired, renamed, or restricted, every alpha dApp briefly can't generate proofs until the SDK is updated.
- The right party to publish a production URL is the Midnight team (the asset owner), not the SDK maintainer. So the alpha documents this dependency rather than self-hosting.

**Your own `.compact` contract's proving keys are NOT affected by this.** Those download from a URL **you** supply when you call `ProvingKeyManager.downloadCircuitKeys(baseUrl = …, …)`; for example, BBoard hosts BBoard's keys. You always own your contract's keys. This limitation applies only to the protocol-wide keys that every Midnight dApp shares.

**How it will evolve.** When a production URL is published, or, if that is not on the Midnight roadmap soon, when the SDK mirrors these files under a `kuiralabs`-controlled URL with a version pin (`ProvingKeyManager.CURRENT_VERSION` tracks the protocol version, currently 9), the SDK swaps the constant and republishes. The expected migration cost for a consumer is a single SDK version bump, with no app-side code change.

---

## See also

- **[Kuira Starter](https://github.com/kuiralabs/kuira-starter-android)**: a clone-and-run minimal dApp (also a GitHub template).
- **[BBoard](https://github.com/kuiralabs/example-bboard-android)**: an on-chain bulletin board that shows the deploy → call → read flow end to end.
- [Home](index.md): install instructions and the full module list.
- [Security](security.md): threat model, vulnerability reporting, and signature verification.
- [Maven Central: `io.github.kuiralabs`](https://central.sonatype.com/namespace/io.github.kuiralabs): every published artifact (binary AAR, sources jar, javadoc jar, POM, and PGP signature).
