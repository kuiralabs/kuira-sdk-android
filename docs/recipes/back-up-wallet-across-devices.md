---
title: Back up wallet data across devices
tags:
  - wallet
  - dust
  - backup
  - drive
prerequisites:
  - Kuira added to your project (see "Add Kuira to an Android project")
  - A Sigil session (see "Set up Sigil identity") — the backup key is derived from the wallet seed
  - A Google Cloud project you control (free tier is fine)
agent_bundle: https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/back-up-wallet-across-devices.md
---

# Back up wallet data across devices

**Outcome:** the wallet's Dust sync state is backed up — encrypted — to
the user's own Google Drive and restored on a new device, so the first
sync on a fresh install is a fast delta instead of replaying the whole
chain from genesis.

> **Seeing a genesis replay on PreProd?** This recipe is the fix. On a
> long-lived network like **PreProd** the chain history is large, so a wallet's
> first sync **replays from genesis — minutes, not seconds.** Cloud backup is
> what turns that into a fast delta restore. The catch: the restore only runs
> once the one-time OAuth setup below is done. **Without a registered OAuth
> client, cloud sync silently fails with `UNREGISTERED_ON_API_CONSOLE`, so
> PreProd keeps replaying from genesis on every fresh sync** — even though the
> wallet itself works fine. If you expected the cloud restore to kick in and it
> didn't, this setup is the missing piece.

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/back-up-wallet-across-devices.md"
     data-task="Enable cross-device wallet-data backup in this Kuira app: register a Google Cloud OAuth client for the drive.appdata scope (Android client with the app's package name + signing SHA-1), enable the Google Drive API, and verify the wallet panel's cloud sync action succeeds without UNREGISTERED_ON_API_CONSOLE."></div>

---

## What you get, and what you don't have to do

The SDK already does the work: it encrypts the Dust checkpoint with a
key **derived from the wallet seed** (AES-256-GCM, on-device — the cloud
only ever holds ciphertext), uploads it to Google Drive's hidden
per-app **`appDataFolder`**, and on another device pulls it back and
seeds the sync. The wallet panel exposes a single **cloud sync** action
that runs the backup-or-restore in one tap.

The only thing the SDK *can't* do for you is authorize itself with
Google. That's a one-time setup in the Google Cloud Console: an OAuth
client that matches your app's package name + signing key, for the
`drive.appdata` scope. Without it, the first cloud sync fails with
`UNREGISTERED_ON_API_CONSOLE`.

`drive.appdata` is a **non-sensitive** scope — it grants access only to
your app's own hidden folder, not the user's Drive files — so it needs
**no Google verification and no Play review**.

---

## Step 1 — Create the consent screen

In the [Google Cloud Console](https://console.cloud.google.com), select
(or create) a project, then open **Google Auth Platform → Get started**
and fill in the app name + user support email.

> **Verify:** the Auth Platform overview shows your app name and a
> "Publishing status: Testing" badge.

## Step 2 — Add yourself as a test user

Under **Google Auth Platform → Audience**, add the Google account
you'll sign in with on the device as a **test user**. While the app is
in Testing, only listed accounts can complete consent.

> **Verify:** your account email appears in the Test users list.

## Step 3 — Add the `drive.appdata` scope

Under **Google Auth Platform → Data Access → Add or remove scopes**,
manually add:

```
https://www.googleapis.com/auth/drive.appdata
```

It's the **Application Data Folder** scope. Don't confuse it with the
Cloud Storage `devstorage.*` scopes — those are a different product and
won't authorize Drive.

> **Verify:** `.../auth/drive.appdata` is listed under "Your non-sensitive scopes."

## Step 4 — Enable the Google Drive API

Open **APIs & Services → Library**, search **Google Drive API**, and
click **Enable**. The scope grants permission; the API has to be turned
on for the project to serve requests.

> **Verify:** the Drive API shows "API Enabled" with a Manage button.

## Step 5 — Create the Android OAuth client

Under **Google Auth Platform → Clients → Create client → Android**,
enter:

- **Package name** — your app's `applicationId`.
- **SHA-1 certificate fingerprint** — the signing key for the build
  you're testing. For a debug build:

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

Google matches the OAuth request on **(package name, SHA-1)** — both
must match the installed build exactly, so a release build needs its own
client entry with the release signing fingerprint.

> **Verify:** the new Android client appears under Clients with your
> package name.

## Step 6 — Run the cloud sync

Build, install, sign in, and tap **cloud sync** in the wallet panel.
First use runs the Drive consent flow (one system dialog); after that
it's silent.

> **Verify:** the action reports success (e.g. "cloud synced ✓") with no
> `UNREGISTERED_ON_API_CONSOLE`. On a second device signed into the
> **same Google account**, a fresh install's first sync logs a delta
> resume rather than a full genesis replay.

---

## Where the backup lives

`appDataFolder` is **hidden by design** — it never shows up when you
browse Drive in the web or app UI. To confirm a backup exists, open
Drive **Settings → Manage apps**; your app appears there with the space
its hidden data uses. (Programmatically, the SDK proves it by fetching
the blob back.)

## The same-account caveat

The app can't choose *which* Google account Drive uses — it follows the
account the user grants consent with. **Use the same Google account on
both devices.** A different account points at a different (empty)
`appDataFolder`, so the restore finds nothing and the device falls back
to a normal full sync — never a crash, just no speed-up.

---

## Troubleshooting

| Symptom | What it means |
|---|---|
| `UNREGISTERED_ON_API_CONSOLE` on first sync | No OAuth client matches this build. Re-check the package name **and** the SHA-1 against the installed build (debug vs release differ), and that the Drive API is enabled (Step 4). |
| Consent dialog shows "app isn't verified" / access blocked | The signing account isn't a test user. Add it under Audience (Step 2). |
| "Nothing in my Drive" | Expected — `appDataFolder` is invisible in the Drive UI. Check Settings → Manage apps. |
| New device still does a full genesis sync | Different Google account on the two devices (see the caveat), or no backup was uploaded yet on the source device. |

---

## What's next

- **[Set up Sigil identity](set-up-sigil-identity.md)** — the wallet
  seed that the backup key is derived from.
- **[Run kuiraDoctor before each release](run-kuira-doctor.md)** — its
  assetlinks check guards the other half of the passkey + recovery flow.
