---
title: Quickstart
---

# Quickstart

The shortest path from nothing to a running Kuira dApp, in order — each step has a check so you know it worked. New to Android? Do the [Prerequisites](prerequisites.md) first.

This clones the **counter starter** — a complete, runnable dApp — and makes it yours.

## 1. Clone the starter

```bash
git clone https://github.com/kuiralabs/kuira-starter-android
cd kuira-starter-android
```

## 2. Point it at a domain you control (passkey)

The starter's passkey relying-party id is `kuiralabs.github.io` — you **must** change it to a domain *you* host, or every sigil-forge fails with `RP_ID_MISMATCH`.

- Set `PASSKEY_RP_ID` in `app/src/main/java/.../di/PasskeyConfigModule.kt` to your domain.
- Host `assetlinks.json` at `https://<your-domain>/.well-known/assetlinks.json` with your app's package + **SHA-256** signing fingerprint.

Full walkthrough: **[Bind your app to a passkey domain](recipes/bind-your-app-to-a-passkey-domain.md)**.

!!! check
    `curl -s https://<your-domain>/.well-known/assetlinks.json` returns HTTP 200, `application/json`, listing the SHA-256 from `./gradlew :app:signingReport`.

## 3. Start localnet

```bash
mn localnet up
```
On **Windows**, if this fails with `spawnSync … ETIMEDOUT`, use `docker compose -f ~/.midnight/localnet/compose.yml up -d` instead (see [Prerequisites](prerequisites.md#operating-system-notes)).

!!! check
    `mn localnet status` shows the node, indexer, and proof server up. Docker is running (`docker info`).

## 4. Wire the device to localnet

=== "Emulator"
    Nothing to do — the app reaches localnet at `10.0.2.2`. (Use SDK `{{ kuira_version }}`+ for an x86_64 AVD.)

=== "Physical device"
    Forward the three localnet ports to the phone:
    ```bash
    adb reverse tcp:9944 tcp:9944 && adb reverse tcp:8088 tcp:8088 && adb reverse tcp:6300 tcp:6300
    ```

## 5. Build & run

```bash
./gradlew :app:installDebug      # or hit Run ▶ in Android Studio
```
SIM-less phone with no "Install via USB"? Use the [`adb push` fallback](prerequisites.md#emulator-or-device).

!!! check
    The app launches and shows the wallet panel — no `java.lang.UnsatisfiedLinkError`. (If you hit one, you're on an x86_64 emulator with `alpha03` — use `{{ kuira_version }}`+ or an arm64 AVD.)

## 6. Forge your sigil

Tap **Forge sigil**. A passkey-derived identity + embedded wallet is created in one biometric.

!!! check
    The wallet panel shows an address. (If Forge fails with `RP_ID_MISMATCH`, re-check step 2.)

## 7. Fund the wallet

Copy the wallet address from the panel, then airdrop NIGHT:
```bash
mn airdrop 1000 --wallet <addr> --network undeployed
```

!!! warning "Register dust IN-APP — not from the CLI"
    Now tap **Register dust** in the wallet panel to generate the DUST that pays gas. Do this **in the app** — `mn dust register --wallet <name>` operates on a *named* `mn wallet generate` wallet and **cannot** target the app's embedded wallet address.

!!! check
    The panel shows NIGHT, then DUST after ~30 seconds.

## 8. Deploy & call the contract

Tap **Deploy counter**, then **Increment**.

!!! check
    The count updates after one block (~3s on localnet). If **Deploy hangs at "Balancing"** and never finishes → the wallet has no DUST → finish step 7 (fund + tap Register dust in-app), then retry.

---

You have a working zero-knowledge dApp. Next:

- **[Hello Compact](recipes/hello-compact.md)** — write your own contract.
- **[Deploy and call a Compact contract](recipes/deploy-and-call-a-compact-contract.md)** — wire a contract into your own app.
- **[Set up Sigil identity](recipes/set-up-sigil-identity.md)** — the identity panel in your app.
