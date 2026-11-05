---
title: Set up Sigil identity
tags:
  - identity
  - sigil
  - passkey
prerequisites:
  - Kuira added to your project (see "Add Kuira to an Android project")
  - PasskeyConfig provided and assetlinks.json hosted
agent_bundle: https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/set-up-sigil-identity.md
---

# Set up Sigil identity

**Outcome:** your app forges a sigil (a PRF-derived DID and wallet seed tied to a single passkey) and can later sign the user in with one biometric prompt that yields both identity and funding authority.

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/set-up-sigil-identity.md"
     data-task="Set up Kuira Sigil identity in this app: wire SigilPanelViewModel into a Compose screen for forge/sign-in, handle the forged → restore → ready state machine, and make sure single-biometric sign-in flows through SigilSession."></div>

---

## What "sigil" means here

A sigil is the unit of identity in Kuira. It consists of:

- A **DID** (Decentralized Identifier) derived from a PRF over a passkey assertion: `did:key:z6Mk…`.
- A **wallet seed** derived from the same passkey through a different PRF salt. It produces BIP-39-compatible 24-word entropy that you never have to show the user.
- A **Block Store backup** of both, PRF-encrypted on the client before Google's Block Store receives the blob.

With one passkey, one biometric, and one tap, the user has both the identity and the funding key. Onboarding shows no seed phrase; the optional recovery-phrase export (BIP-39) is a separate flow.

---

## Prerequisites

- You completed the previous recipe ([Add Kuira to an Android project](add-kuira-to-an-android-project.md)): dependency, `PasskeyConfig`, and `assetlinks.json`. The `PasskeyConfig` binding is **mandatory**; see **[Bind your app to a passkey domain](bind-your-app-to-a-passkey-domain.md)**. Without it, `assembleDebug` fails fast with a Dagger missing-binding error by design.
- A Compose-based UI host. The SDK ships `SigilStatusPanel` as a ready-made Compose component you can drop in, or you can render a custom UI on top of `SigilPanelViewModel`.

---

## Step 1: Add the SDK provider to your Application class

The SDK must be reachable across the app. Wire it as an injected singleton through Hilt:

```kotlin title="app/src/main/.../MyApp.kt"
package com.example.myapp

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class MyApp : Application()
```

Then declare it in your manifest:

```xml title="app/src/main/AndroidManifest.xml" hl_lines="4"
<application
    android:name=".MyApp"
    android:allowBackup="false"
    android:label="Your App">
    <!-- … -->
</application>
```

`@HiltAndroidApp` creates the dependency graph that the SDK's modules plug into. Once Hilt is on, the SDK installs its `IdentityModule`, `AuthModule`, `WalletRuntimeModule`, and `DappUiModule` automatically.

You **must** supply one binding yourself: a `@Provides PasskeyConfig` binding (a `PasskeyConfigModule`; see the **[Bind your app to a passkey domain](bind-your-app-to-a-passkey-domain.md)** recipe). Without it, `assembleDebug` does not compile. The missing binding is an intentional Dagger build error, because the SDK can't forge a sigil without knowing your passkey domain.

**Verify:** with your `PasskeyConfig` binding in place, `./gradlew :app:assembleDebug` succeeds and Hilt generates `MyApp_HiltComponents` under `app/build/generated/hilt/`. (Without the binding, the build fails fast with a missing `PasskeyConfig` binding error. This is expected.)

---

## Step 2: Drop the `SigilStatusPanel` Composable into your UI

The panel composable's signature, in declaration order, is:

```kotlin
SigilStatusPanel(
    modifier = Modifier,
    colors = SigilPanelColors.Default,
    viewModel = hiltViewModel(),   // from androidx.hilt.navigation.compose
    onStatusChange = {},
    onOpenSettings = {},
)
```

Every parameter has a default, so the zero-arg call works as a drop-in. `onStatusChange` fires on each sigil state transition. `onOpenSettings` runs when the user taps the panel's settings control, so you can route them to your own settings screen. The hosting Activity must subclass `FragmentActivity` so the panel's internal biometric prompts can run. `AppCompatActivity` satisfies this; `ComponentActivity` alone does not.

```kotlin title="app/src/main/.../MainActivity.kt"
package com.example.myapp

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import com.example.myapp.ui.MainScreen
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {                       // (1)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {                                      // (2)
                Surface(modifier = Modifier.fillMaxSize()) {
                    MainScreen()
                }
            }
        }
    }
}
```

1. `@AndroidEntryPoint` is required for `hiltViewModel()` to resolve.
2. The panel uses Material 3 primitives, so a `MaterialTheme` ancestor must be present.

```kotlin title="app/src/main/.../ui/MainScreen.kt"
package com.example.myapp.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.midnight.kuira.dapp.sigil.SigilStatusPanel

@Composable
fun MainScreen() {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("My Midnight dApp")
        // Zero-arg call is the canonical drop-in: the SDK defaults
        // `modifier = Modifier`, `colors = SigilPanelColors.Default`,
        // `viewModel = hiltViewModel()`, `onStatusChange = { }`, and
        // `onOpenSettings = { }`.
        SigilStatusPanel()
    }
}
```

To react to sigil state transitions, pass an `onStatusChange` callback:

```kotlin
SigilStatusPanel(
    onStatusChange = { status ->
        // status is com.midnight.kuira.dapp.sigil.SigilStatus, one of:
        // Initializing, None, BackupAvailable, Creating(stage),
        // Forged(did, credentialId, publicKeyHex), Error(message).
        // Initializing is the first value emitted while the panel bootstraps.
    },
)
```

To restyle the panel, pass a custom `SigilPanelColors` or a non-default `Modifier`. Both have sensible defaults; override them only when you need to.

The panel renders one of six states:

- `Initializing`: the first value emitted while the panel bootstraps. Shows a loading state.
- `None`: no sigil on this device. Shows a **Forge** button.
- `BackupAvailable`: Block Store knows about a previous sigil. Shows a **Restore** button.
- `Creating(stage)`: a forge or restore is in progress. `stage` is a human-readable progress label.
- `Forged`: the sigil exists and is unlocked. Renders the DID, balance, and copy actions.
- `Error(message)`: a recoverable error. Shows the message and a retry path.

**Verify:** launch your app on an Android 13+ device with a screen lock. The panel renders one of these states based on Block Store presence.

!!! tip "Showing the sigil and wallet together"
    This recipe drops in the **sigil** panel on its own. To show the sigil **and** the wallet as a pair of draggable floating chips (the current canonical integration), host both in one `PanelBar(floating = true)` rather than placing the panels inline. `PanelBar` drives the same `SigilPanelViewModel`, so everything in this recipe still applies.

---

## Step 3: Forge a sigil (first-run flow)

In the panel UI, tap **Forge sigil**. The SDK then does the following:

1. `SigilPanelViewModel.forgeSigil(activity)` invokes the passkey `create` ceremony with the `rpId` you declared.
2. The user authenticates with their biometric or screen lock.
3. The SDK performs **two PRF assertions** in the same ceremony (`SIGIL_SALT` and `SEED_SALT`), which yield the DID-derivation entropy and the wallet-seed entropy from a single biometric.
4. The SDK persists both to `EncryptedSharedPreferences`, and a PRF-encrypted backup blob lands in Google Block Store.

After the forge completes, the panel transitions to **`Forged`** and the wallet is ready to fund.

**Verify:** on the same device, kill and restart the app. The panel now renders **`Forged`** without a new prompt (the sigil state loads from local prefs). Tap any value-bearing action: the SDK prompts for a biometric only when the session cache expires.

---

## Step 4: Sign in on a fresh device (restore flow)

When the user installs the app on a second device with the same Google account:

1. The app launches, and Block Store reports that a backup is available.
2. The panel renders `BackupAvailable` with a **Restore** button.
3. The user taps it and passes the biometric prompt. The SDK runs the dual-PRF assertion against the saved passkey, derives the same DID and wallet seed, and seeds local state.

**Verify:** confirm the restored DID matches the original. Any funds that were on-chain at backup time resolve through balance sync after a few seconds.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Panel stuck on `None` even though Block Store should have a backup | A different Google account on this device, or the Block Store backup hasn't propagated yet. | Verify the GPM signed-in account; wait 1–2 min after the first forge for the backup to land in Block Store. |
| Forge fails with `RP_ID_MISMATCH` | `assetlinks.json` is not reachable, or `PasskeyConfig.rpId` ≠ the domain that hosts it. | See Recipe 1 Step 3. |
| Two devices on the same Google account resolve to the same sigil | This is by design: passkeys are per-account in GPM. To test distinct identities on emulators, use distinct Google accounts. | A debug-only per-device identity seam is not supported today. |
| Restore prompt fails with `BackupException` | The backup blob is missing or corrupted, or the user tapped restore when they should have forged. | The `Error` body offers retry. If it still fails, tap "Sign out → Forge" (a data-layer guard prevents accidental overwrite). |

---

## What's next

- **[Deploy and call a Compact contract](deploy-and-call-a-compact-contract.md)**: now that your app has a sigil-bound wallet, use it to deploy a contract and call a circuit.
- **[Security § Verifying releases](../security.md#verifying-releases)**: verify the SDK artifacts on your CI before you ship a release.
