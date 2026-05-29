---
title: Add Kuira to an Android project
tags:
  - setup
  - integration
  - hilt
prerequisites:
  - Android Studio Ladybug or newer
  - JDK 17
  - minSdk 30+
  - Hilt + KSP already wired in the project
agent_bundle: https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/add-kuira-to-an-android-project.md
---

# Add Kuira to an Android project

**Outcome:** your existing Android app builds against the Kuira SDK,
recognises your passkey domain, and has the Hilt graph wired so any
`@HiltViewModel` consuming SDK panels resolves cleanly.

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/add-kuira-to-an-android-project.md"
     data-task="Integrate Kuira SDK into this Android project — install the dependency, provide a PasskeyConfig Hilt module for the project's own domain, and enable debug cleartext for localnet (assetlinks.json hosting is left to the developer)."></div>

---

## Prerequisites

- An Android project on **AGP 8.13.x or newer** with `minSdk ≥ 30`.
- **Hilt + KSP** already configured (`com.google.dagger.hilt.android` plugin
  applied + KSP for the Hilt compiler). If Hilt isn't set up, do that first.
- **A domain you control** that will serve as your passkey relying-party
  identifier (e.g. `yourapp.example.com`). You need write access to host
  `.well-known/assetlinks.json` on it.
- **JDK 17** as your project's `sourceCompatibility` /
  `targetCompatibility` / `jvmTarget`.

---

## Step 1 — Add the dependency

=== "Gradle (Kotlin DSL)"

    ```kotlin title="app/build.gradle.kts"
    dependencies {
        implementation("io.github.kuiralabs:dapp-ui:0.1.0-alpha01")
    }
    ```

=== "Gradle (Groovy)"

    ```groovy title="app/build.gradle"
    dependencies {
        implementation 'io.github.kuiralabs:dapp-ui:0.1.0-alpha01'
    }
    ```

The `dapp-ui` module `api`-exposes the rest of the consumer surface
(`midnight-sdk`, `wallet-runtime`, `identity`, `compact-engine`, …),
so you only need this one line.

**Verify:** run `./gradlew :app:dependencies | grep kuiralabs` — you
should see roughly a dozen `io.github.kuiralabs:*` entries pulled in
transitively, all at the same version.

---

## Step 2 — Provide your `PasskeyConfig`

The SDK requires every consumer dApp to declare its own passkey
relying-party identifier (RP ID). Create a Hilt module:

```kotlin title="app/src/main/.../di/IdentityConfigModule.kt"
package com.example.myapp.di

import com.midnight.kuira.core.identity.PasskeyConfig
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
    fun providePasskeyConfig(): PasskeyConfig = PasskeyConfig(
        rpId = "yourapp.example.com",     // (1)
        rpName = "Your App",               // (2)
    )
}
```

1. **Use a domain you control.** Passkey assertions are bound to this
   value; consumers using `nel349.github.io` or another maintainer
   domain will silently fail PRF derivation.
2. **User-facing label** shown in the passkey prompt
   ("Create a passkey for *Your App*").

**Verify:** `./gradlew :app:assembleDebug` should compile. Hilt's KSP
generation runs at compile time — if `PasskeyConfig` isn't provided,
you'll see a "missing binding for `PasskeyConfig`" error.

---

## Step 3 — Host `assetlinks.json` on your domain

Digital Asset Links bind your Android app's package name + signing
cert to your passkey domain. Without this, the passkey API refuses
to honour your `PasskeyConfig.rpId`.

Find your app's SHA-256 cert fingerprint:

```bash
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android \
  | grep "SHA256:"
```

Host this JSON at `https://yourapp.example.com/.well-known/assetlinks.json`:

```json title="assetlinks.json"
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.myapp",
      "sha256_cert_fingerprints": [
        "AB:CD:EF:…:01:23:45"
      ]
    }
  }
]
```

For GitHub Pages: put it at `<your-repo>/.well-known/assetlinks.json`
on the branch GitHub Pages serves from.

**Verify:** `curl -I https://yourapp.example.com/.well-known/assetlinks.json`
should return `HTTP/2 200` with `Content-Type: application/json`. The
file must be reachable over HTTPS and not behind any auth — the
passkey API fetches it anonymously at registration time.

---

## Step 4 — Enable debug cleartext for localnet (optional)

If you'll target a Midnight localnet during development, the indexer +
node speak over plain HTTP on `10.0.2.2` (emulator) or `127.0.0.1`
(physical device with `adb reverse`). Add a debug-only manifest
override so Android's network security policy doesn't block them:

```xml title="app/src/debug/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:usesCleartextTraffic="true" />
</manifest>
```

The release build is unaffected — PREPROD and mainnet use HTTPS.

**Verify:** running against localnet, `adb logcat | grep -i "kuira\|midnight"`
should show indexer connection success, not `CLEARTEXT communication
not permitted`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Could not resolve io.github.kuiralabs:dapp-ui` | Missing `mavenCentral()` in `settings.gradle.kts` `dependencyResolutionManagement.repositories`. | Add it. |
| `Missing binding for PasskeyConfig` at Hilt KSP time | Step 2 not done. | Create `IdentityConfigModule.kt`. |
| `Passkey not supported on this device` at runtime | Device lacks Google Password Manager (Android 13 / GMS Core 23.40.13+ required) or screen-lock is disabled. | Enable a device PIN/biometric. |
| `RP_ID_MISMATCH` at passkey creation | `assetlinks.json` is unreachable, returns wrong content-type, or contains the wrong SHA-256. | Verify `curl -I`, double-check the fingerprint. |
| `CLEARTEXT communication not permitted` | Step 4 not done and you're targeting localnet. | Add `src/debug/AndroidManifest.xml`. |

---

## What's next

- **[Set up Sigil identity](set-up-sigil-identity.md)** — actually use
  the SDK to bootstrap a passkey-derived sigil session in your app.
- **[Deploy and call a Compact contract](deploy-and-call-a-compact-contract.md)**
  — go end-to-end from a compiled `.compact` to an on-chain transaction.
