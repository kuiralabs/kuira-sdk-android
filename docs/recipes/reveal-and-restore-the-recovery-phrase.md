---
title: Reveal & restore the recovery phrase
tags:
  - recovery
  - security
  - wallet
prerequisites:
  - Kuira added to your project (see "Add Kuira to an Android project")
  - A Sigil set up so a wallet exists to reveal (see "Set up Sigil identity")
  - A FragmentActivity-derived host (biometric prompts run off it)
agent_bundle: https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/reveal-and-restore-the-recovery-phrase.md
---

# Reveal & restore the recovery phrase

**Outcome:** your app reveals the user's 24-word BIP-39 recovery phrase on a
screen *you* control, restores a wallet from a phrase, and (optionally) tunes
the session-lock timing — all on the public `WalletRecovery` contract,
independent of the bundled wallet pill.

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/reveal-and-restore-the-recovery-phrase.md"
     data-task="Build a custom recovery-phrase reveal + restore flow on Kuira's WalletRecovery contract: inject WalletRecovery, reveal the 24 words behind a biometric on a FLAG_SECURE screen I own (I control clipboard/copy policy + timing), validate + restore from a phrase with isValidPhrase/restoreFromPhrase, and tune SessionLock.idleTimeoutMs for the auto-lock that scrubs a revealed phrase."></div>

---

## Why this exists

The Sigil seed is `PRF(passkey)`, but that PRF output **is** standard BIP-39
entropy — so every wallet has a canonical 24-word phrase that reconstructs it
exactly, independent of the passkey, the device, or any provider. It's the
final, self-custody recovery path (the full model lives in
[Security](../security.md)).

!!! tip "Don't need a custom UI? Use the bundled one."
    The drop-in wallet panel already ships this: the gear in the expanded
    panel opens a Settings screen with **View recovery phrase** (reveal) under
    SECURITY, all behind safe defaults — `FLAG_SECURE`, an auto-clearing
    clipboard, a biometric gate. This recipe is for when you want your **own**
    onboarding/reveal screens instead.

---

## Who owns what

`WalletRecovery` owns the **cryptography and secure-vault handling** — biometric
gating, deriving the phrase from the vault, wiping entropy after use. It exposes
**no UI policy** on purpose: when you render the words yourself, the
**screen-level security parameters are entirely yours** to set —

- whether copy-to-clipboard is offered at all, and if so, how soon it auto-clears;
- `FLAG_SECURE` (screenshot / recents-thumbnail blocking);
- whether a fresh biometric is required each reveal (it is — `revealPhrase`
  always re-authenticates) and any extra re-auth cadence you want on top.

The one timing knob the SDK itself owns is the **session auto-lock** (Step 4),
because that lock is what scrubs a revealed phrase from memory.

---

## Step 1 — Get the recovery contract

`WalletRecovery` is a Hilt-bound singleton. Inject it into a ViewModel (or read
it off `MidnightSdkProvider.recovery` if you already hold the provider):

```kotlin title="app/src/main/.../RecoveryViewModel.kt"
package com.example.myapp.recovery

import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.midnight.kuira.core.auth.AuthenticationCancelledException
import com.midnight.kuira.sdk.walletseed.InvalidRecoveryPhraseException
import com.midnight.kuira.sdk.walletseed.RecoveryNotAllowedException
import com.midnight.kuira.sdk.walletseed.WalletRecovery
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RecoveryViewModel @Inject constructor(
    private val recovery: WalletRecovery,            // (1)
) : ViewModel() {

    val phrase = MutableStateFlow<List<String>?>(null)   // the revealed words, or null
    val error = MutableStateFlow<String?>(null)
}
```

1. The SDK binds `WalletRecovery` → its default implementation in the Hilt
   graph (`@HiltAndroidApp` from the install recipe is all that's required).

**Verify:** `./gradlew :app:assembleDebug` succeeds — Hilt resolves the binding.

---

## Step 2 — Reveal the phrase on a screen you secure

`revealPhrase(activity)` triggers the biometric and returns the 24 words. **The
words are the keys to the wallet** — the caller's security contract is: render
only under `FLAG_SECURE`, never log / persist / transmit them, and drop the
reference promptly.

```kotlin title="RecoveryViewModel.kt (continued)"
fun reveal(activity: FragmentActivity) {
    viewModelScope.launch {
        error.value = null
        try {
            phrase.value = recovery.revealPhrase(activity)   // biometric-gated
        } catch (e: AuthenticationCancelledException) {
            // User dismissed the prompt — no error, just don't reveal.
        } catch (e: Exception) {
            error.value = "Couldn't reveal the phrase"       // never log e with the words
        }
    }
}

fun clear() { phrase.value = null }   // call when the screen leaves
```

Your screen owns the rest. A minimal secure host:

```kotlin title="app/src/main/.../RecoveryScreen.kt"
@Composable
fun RecoveryScreen(vm: RecoveryViewModel = hiltViewModel()) {
    val activity = LocalContext.current as FragmentActivity
    val words by vm.phrase.collectAsStateWithLifecycle()

    // FLAG_SECURE for the lifetime of this screen — no screenshots / recents.
    val context = LocalContext.current
    DisposableEffect(Unit) {
        val window = (context as? Activity)?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        onDispose {
            window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            vm.clear()                                       // drop the words on exit
        }
    }

    if (words == null) {
        Button(onClick = { vm.reveal(activity) }) { Text("Reveal recovery phrase") }
    } else {
        // Render the 24 words. YOUR clipboard policy: e.g. offer no copy at all,
        // or copy + scrub after a timeout you choose.
        words!!.forEachIndexed { i, w -> Text("${i + 1}. $w") }
    }
}
```

**Verify:** open the screen, authenticate — the 24 words render, and a
screenshot attempt is blocked (black frame). Background the app: the recents
thumbnail shows nothing.

---

## Step 3 — Restore a wallet from a phrase

Validate live with `isValidPhrase` (normalizes casing/whitespace), then
`restoreFromPhrase`. It reproduces the **exact** wallet and marks the phrase
saved on success.

```kotlin title="RecoveryViewModel.kt (continued)"
fun isValid(words: List<String>) = recovery.isValidPhrase(words)   // live input feedback

fun restore(activity: FragmentActivity, words: List<String>) {
    viewModelScope.launch {
        try {
            recovery.restoreFromPhrase(activity, words)
            // success — wallet is back; navigate on
        } catch (e: InvalidRecoveryPhraseException) {
            error.value = "Those 24 words aren't a valid recovery phrase"
        } catch (e: RecoveryNotAllowedException) {
            error.value = "A wallet already exists — sign out before restoring"
        } catch (e: AuthenticationCancelledException) {
            // cancelled — let them retry
        }
    }
}
```

Restore only works onto a **fresh** vault — `restoreFromPhrase` throws
`RecoveryNotAllowedException` if a wallet already exists, so the user can't
silently overwrite one. Sign out first to restore over an existing device.

**Verify:** on a device with no wallet, paste a known good phrase → balance
resolves after sync. Paste a phrase with one word wrong → `InvalidRecoveryPhraseException`.

---

## Step 4 — Tune the auto-lock timing (optional)

The session auto-lock is what drops the cached seed **and scrubs a revealed
phrase** from memory. Its timing is host-tunable — inject `SessionLock` and set
the windows (defaults: 5 min idle, 30 s background grace):

```kotlin
@Inject lateinit var sessionLock: SessionLock

// e.g. a stricter wallet: lock after 2 min idle, 10 s after backgrounding
sessionLock.idleTimeoutMs = 2 * 60_000L
sessionLock.backgroundGraceMs = 10_000L
```

**Verify:** reveal the phrase, then leave the app idle past `idleTimeoutMs` —
the session locks and the phrase is gone on return (re-auth required).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `revealPhrase` throws immediately, no biometric | No wallet on this device yet — nothing to reveal. | Forge / restore a Sigil first (see "Set up Sigil identity"). |
| Reveal prompt appears then nothing happens | User dismissed the biometric — surfaces as `AuthenticationCancelledException`. | Expected; catch it and stay on the consent step (no error). |
| Screenshot still captures the words | `FLAG_SECURE` not applied — host isn't an `Activity`, or you set it on the wrong window. | Set it on the hosting `Activity`'s window in a `DisposableEffect`, as shown. |
| `restoreFromPhrase` throws `RecoveryNotAllowedException` | A wallet already exists on the device. | Sign out first; restore targets a fresh vault by design. |
| Restored wallet shows zero balance | Balance hasn't synced yet, or the phrase reconstructs a different (empty) wallet. | Wait for sync; confirm the phrase matches the funded wallet. |

---

## What's next

- **[Set up Sigil identity](set-up-sigil-identity.md)** — the passkey-derived
  identity + wallet this phrase reconstructs.
- **[Back up wallet data across devices](back-up-wallet-across-devices.md)** —
  the automatic, provider-backed recovery layer this sits beneath.
- **[Security](../security.md)** — the full recovery model and threat model.
