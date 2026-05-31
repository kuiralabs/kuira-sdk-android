---
title: Run kuiraDoctor before each release
tags:
  - doctor
  - preflight
  - release
  - troubleshooting
prerequisites:
  - Kuira added to your project (see "Add Kuira to an Android project")
  - The `com.midnight.kuira.contract` Gradle plugin applied
agent_bundle: https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/run-kuira-doctor.md
---

# Run `kuiraDoctor` before each release

**Outcome:** the `kuiraDoctor` Gradle task runs four preflight checks
against your app's configuration and surfaces every misconfiguration
that the SDK would otherwise convert into a runtime crash on a user's
device. Run it before each release; wire it into CI to gate builds.

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/run-kuira-doctor.md"
     data-task="Wire kuiraDoctor into this Kuira-using Android project so it runs before each release build. Set kuiraContract.rpId to the project's passkey hostname so the assetlinks reachability check is active. Set kuiraContract.requireDoctorPass to true on CI / release-build configurations so FAIL severities gate the APK."></div>

---

## What it catches

| Check | What goes wrong without it (on a user's device) |
|---|---|
| **minSdk floor** | Manifest merger surfaces `minSdkVersion N cannot be smaller than version 30` mid-build — but in the wrong place, deep in the AGP error stack. |
| **Debug-cleartext manifest** | Localnet indexer connection fails with a generic `IOException`; user sees an unrecoverable "Loading…" state with no diagnostic. |
| **`assetlinks.json` reachability + applicationId match** | Forge fails with `RP_ID_MISMATCH` / `PRF authentication failed` / silent biometric dismissal. Causes include: file not hosted, wrong hostname, Jekyll-stripped the `.well-known` path on GitHub Pages, applicationId not in the targets array. |
| **Compact runtime pin** | QuickJS contract runtime crashes with `Unsupported bytecode version` the first time the user calls a circuit. |

The runtime-pin check is also enforced by `validateKuiraContractSource`
at build time independently; `kuiraDoctor` rolls it into a unified
report so the consumer sees one pass/fail surface, not two.

---

## Quick start

Add to your `app/build.gradle.kts`:

```kotlin
plugins {
    id("com.midnight.kuira.contract") version "{{ kuira_contract_plugin_version }}"
}

kuiraContract {
    source.set("contract/src/managed/<your-contract>")

    // For the assetlinks-reachability check:
    rpId.set("kuiralabs.github.io")   // YOUR passkey hostname

    // Optional: convert FAIL severities into build failures.
    // Default false (warn-only). Set true on CI / release builds.
    // requireDoctorPass.set(true)
}
```

Then run:

```bash
./gradlew :app:kuiraDoctor
```

You'll see a unified report:

```
─── kuiraDoctor ─────────────────────────────────────────
✓ PASS  minSdk
       minSdk = 30 (Kuira SDK requires ≥ 30)
✓ PASS  debug-cleartext
       Debug manifest permits cleartext (localnet builds work).
✗ FAIL  assetlinks-reachability
       https://kuiralabs.github.io/.well-known/assetlinks.json returned HTTP 404.
       Common causes:
         1. The file is not yet hosted at this path — see the
            'Bind your app to a passkey domain' recipe.
         2. The file IS in the repo but GitHub Pages stripped it via Jekyll:
            commit an empty .nojekyll at the repo root + redeploy.
         3. The hostname in kuiraContract.rpId is wrong — verify
            https://kuiralabs.github.io/ loads at all.
✓ PASS  compact-runtime-pin
       Contract emits + consumer pins @midnight-ntwrk/compact-runtime {{ compact_runtime_version }}.
─────────────────────────────────────────────────────────
3 passed, 0 warning, 1 error, 0 skipped
```

The task does **not** fail by default — it logs the report and
returns success. Wire `requireDoctorPass` to `true` to gate builds
on the report (see "Gating CI" below).

---

## Severities

| Symbol | Severity | When |
|---|---|---|
| ✓ | **PASS** | Check ran and passed. |
| ⚠ | **WARN** | Check ran but couldn't be fully verified (network unreachable, ambiguous config). Doesn't fail the build regardless of `requireDoctorPass`. |
| ✗ | **FAIL** | Check ran and found a real misconfiguration. Fails the build when `requireDoctorPass = true`. |
| — | **SKIP** | Check couldn't run (missing prerequisite, e.g. `rpId` not set). Doesn't fail the build. |

---

## Wiring details

### Auto-discovery

`kuiraDoctor` reads two values from your `app/build.gradle.kts` via
simple regex:

- `applicationId` from `applicationId = "com.example.app"`
- `minSdk` from `minSdk = 30`

If your build script uses computed values or property delegates that
the regex doesn't match, the corresponding checks downgrade to SKIP
with a log line. Override explicitly via task properties if needed:

```kotlin
tasks.named<com.midnight.kuira.contract.KuiraDoctorTask>("kuiraDoctor") {
    applicationId.set("com.example.app")
    minSdk.set(30)
}
```

### Gating CI

For a CI workflow that blocks merges on `kuiraDoctor` issues:

```yaml title=".github/workflows/release.yml"
- name: Run preflight checks
  run: ./gradlew :app:kuiraDoctor -PkuiraDoctorRequirePass=true
```

And in `app/build.gradle.kts`:

```kotlin
kuiraContract {
    // …
    requireDoctorPass.set(
        providers.gradleProperty("kuiraDoctorRequirePass")
            .map { it.toBoolean() }
            .orElse(false)
    )
}
```

This keeps `requireDoctorPass = false` (warn-only) for local dev
builds and flips it to `true` only when the CI job explicitly sets
the property — devs are never blocked, the release lane is.

### When `kuiraDoctor` doesn't run

The task is **not wired into `preBuild`**. Reasoning:

- The assetlinks check needs network I/O. Adding a network call to
  every local build is hostile.
- Most developers run `assembleDebug` many times per day. Re-running
  preflight every time is wasteful.

If you want to opt into `preBuild`-coupling (sacrificing the above
for tighter local feedback), add to your `app/build.gradle.kts`:

```kotlin
tasks.named("preBuild") {
    dependsOn("kuiraDoctor")
}
```

---

## What it does NOT check

These are out of scope for v1 but on the roadmap:

- **`<queries>` declarations** for cross-app sigil enrollment (Sigil V2
  Track A).
- **Hilt wiring** of `PasskeyConfig` (Dagger already catches this at
  build time, just with a verbose error).
- **Signing-cert fingerprint comparison** against the hosted
  `assetlinks.json` (today it checks the file is reachable + lists
  your `applicationId`; doesn't verify the listed SHA-256 matches
  `./gradlew signingReport`).

For these classes today, see the
[Bind your app to a passkey domain](bind-your-app-to-a-passkey-domain.md)
recipe's troubleshooting table.

---

## Troubleshooting

| Symptom | What it means |
|---|---|
| Task succeeds but report shows ✗ FAIL rows | `requireDoctorPass` is `false` (the default). Set it to `true` to convert FAIL into a build failure. |
| All checks report — SKIP | Plugin extension is unset / not configured. Set `source.set(...)` and `rpId.set(...)` to give checks something to verify. |
| `assetlinks-reachability` always WARNs with "Could not reach" | Network unreachable or `https://<rpId>/` doesn't resolve. The check uses 5-second timeouts and treats network errors as WARN, not FAIL, so a CI environment without internet still ships. |
| `minSdk` reports SKIP | Auto-discovery didn't find `minSdk = N` in your `app/build.gradle.kts`. Set `tasks.named<KuiraDoctorTask>("kuiraDoctor") { minSdk.set(...) }` explicitly. |

---

## What's next

- **[Bind your app to a passkey domain](bind-your-app-to-a-passkey-domain.md)**
  — the recipe `kuiraDoctor`'s assetlinks check verifies you've
  followed.
- **[Hello Compact](hello-compact.md)** — the compact-runtime-pin
  check kicks in once you have a compiled contract under
  `contract/src/managed/`.
