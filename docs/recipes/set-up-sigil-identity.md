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

**Outcome:** your app forges a sigil — a PRF-derived DID + wallet seed
tied to a single passkey — and can later sign the user in with one
biometric prompt that yields both identity and funding authority.

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/set-up-sigil-identity.md"
     data-task="Set up Kuira Sigil identity in this app — wire SigilPanelViewModel into a Compose screen for forge/sign-in, handle the forged → restore → ready state machine, and make sure single-biometric sign-in flows through SigilSession."></div>

---

## What "sigil" means here

A sigil is the unit of identity in Kuira. Concretely it's:

- A **DID** (Decentralized Identifier) derived from a PRF over a
  passkey assertion — `did:key:z6Mk…`.
- A **wallet seed** derived from the same passkey via a different PRF
  salt — produces a BIP-39-compatible 24-word entropy you never have
  to surface to the user.
- A **Block Store backup** of both, PRF-encrypted client-side before
  Google's Block Store touches the blob.

One passkey, one biometric, one tap — and the user has identity AND
the funding key. No seed phrases shown at onboarding; the optional
recovery-phrase export (BIP-39) is its own flow.

---

## Prerequisites

- The previous recipe ([Add Kuira to an Android project](add-kuira-to-an-android-project.md))
  completed: dependency, `PasskeyConfig`, `assetlinks.json`.
- A Compose-based UI host. The SDK ships
  `SigilStatusPanel` as a ready-made Compose component you can drop
  in, or you can render a custom UI on top of `SigilPanelViewModel`.

---

## Step 1 — Add the SDK provider to your Application class

The SDK needs to be reachable across the app. Wire it as an injected
singleton via Hilt:

```kotlin title="app/src/main/.../MyApp.kt"
package com.example.myapp

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class MyApp : Application()
```

And declare it in your manifest:

```xml title="app/src/main/AndroidManifest.xml" hl_lines="4"
<application
    android:name=".MyApp"
    android:allowBackup="false"
    android:label="Your App">
    <!-- … -->
</application>
```

`@HiltAndroidApp` lights up the dependency graph the SDK's modules
plug into. Nothing further required — the SDK's `IdentityModule`,
`AuthModule`, `WalletRuntimeModule`, `SdkModule` are auto-installed
once Hilt is on.

**Verify:** `./gradlew :app:assembleDebug` succeeds and Hilt's
`MyApp_HiltComponents` is generated under
`app/build/generated/hilt/`.

---

## Step 2 — Drop the `SigilStatusPanel` Composable into your UI

```kotlin title="app/src/main/.../ui/MainScreen.kt"
package com.example.myapp.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import com.midnight.kuira.dapp.sigil.SigilStatusPanel

@Composable
fun MainScreen(activity: FragmentActivity) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text("My Midnight dApp")
        SigilStatusPanel(activity = activity)   // (1)
    }
}
```

1. The panel needs a `FragmentActivity` — biometric prompts require
   it, so your host Activity must subclass `FragmentActivity` (or
   `ComponentActivity` doesn't suffice for biometrics).

Behaviourally, the panel renders one of four states:

- **`None`** — no sigil on this device; surfaces a **Forge** button.
- **`BackupAvailable`** — Block Store knows about a previous sigil;
  surfaces a **Restore** button.
- **`Forged`** — sigil exists and is unlocked; renders DID, balance,
  copy actions.
- **`Error`** — recoverable error; shows the message + a retry path.

**Verify:** launch your app on an Android 13+ device with a screen
lock. You should see the panel render one of the four states based
on Block Store presence.

---

## Step 3 — Forge a sigil (first-run flow)

In the panel UI: tap **Forge sigil**. Under the hood:

1. `SigilPanelViewModel.forgeSigil(activity)` invokes the passkey
   `create` ceremony with the `rpId` you declared.
2. The user authenticates with their biometric / screen-lock.
3. The SDK performs **two PRF assertions** in the same ceremony
   (`SIGIL_SALT` + `SEED_SALT`) — yielding the DID-derivation entropy
   and the wallet-seed entropy from a single biometric.
4. Both are persisted to `EncryptedSharedPreferences` and a
   PRF-encrypted backup blob lands in Google Block Store.

After the forge completes, the panel transitions to **`Forged`** and
the wallet is funded-ready.

**Verify:** on the same device, kill and restart the app. The panel
should now render **`Forged`** without a re-prompt (the sigil state
is loaded from local prefs). Tap any value-bearing action — the SDK
will prompt biometric only when the session-cache expires.

---

## Step 4 — Sign in on a fresh device (restore flow)

When the user installs the app on a second device with the same
Google account:

1. The app launches; Block Store reports a backup is available.
2. Panel renders `BackupAvailable` with a **Restore** button.
3. Tap → biometric prompt → SDK runs the dual-PRF assertion
   against the saved passkey, derives the same DID + wallet seed,
   and seeds local state.

**Verify:** confirm the restored DID matches the original. Funds —
if any were on-chain at backup time — should resolve via balance
sync after a few seconds.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Panel stuck on `None` even though Block Store should have a backup | Different Google account on this device, or Block Store backup hasn't propagated yet. | Verify GPM signed-in account; wait 1–2 min after first forge for backup to land in Block Store. |
| Forge fails with `RP_ID_MISMATCH` | `assetlinks.json` not reachable, or `PasskeyConfig.rpId` ≠ the domain that hosts it. | See Recipe 1 Step 3. |
| Two devices on the same Google account resolve to the same sigil | This is by design — passkeys are per-account in GPM. For PvP testing on emulators, use distinct Google accounts. | See the Kuira wishlist `#28` (debug-only per-device identity seam). |
| Restore prompt fails with `BackupException` | Backup blob missing or corrupted, or the user tapped restore when they should have forged. | The `Error` body offers retry. If still failing, tap "Sign out → Forge" (data-layer guard prevents accidental overwrite). |

---

## What's next

- **[Deploy and call a Compact contract](deploy-and-call-a-compact-contract.md)**
  — now that your app has a sigil-bound wallet, use it to deploy a
  contract and call a circuit.
- **[Security § Verifying releases](../security.md#verifying-releases)**
  — verify the SDK artifacts on your CI before shipping a release.
