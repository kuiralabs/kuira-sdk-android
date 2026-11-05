---
title: Bind your app to a passkey domain
tags:
  - identity
  - passkey
  - signing
  - assetlinks
prerequisites:
  - Kuira added to your project (see "Add Kuira to an Android project")
  - A domain you control and can host static files on over HTTPS
agent_bundle: https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/bind-your-app-to-a-passkey-domain.md
---

# Bind your app to a passkey domain

**Outcome:** your debug build's signing fingerprint is listed in an `assetlinks.json` served at your `rpId`, and **Forge** succeeds on device with no `RP_ID_MISMATCH`, no `PRF authentication failed`, and no silent prompt dismissal.

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/bind-your-app-to-a-passkey-domain.md"
     data-task="Bind an Android app's debug build to a passkey rpId.

Discover context first: run `git remote -v` in the project. Take the GitHub user-or-org slug from the origin URL. The natural rpId is `<that-slug>.github.io`, hosted in the special-name repo `<that-slug>/<that-slug>.github.io`. Check whether that backing repo exists on GitHub; if it does not, walk the consumer through creating it. If the consumer prefers a different domain, confirm before proceeding.

Then execute the four-step recipe:
1. `./gradlew :app:signingReport` to capture the debug-variant SHA-256 (add `--no-configuration-cache` if the project sets `org.gradle.configuration-cache=true`).
2. Compose a single-fingerprint assetlinks.json with the project's applicationId and that SHA-256.
3. Commit it to `<that-slug>/<that-slug>.github.io` at `.well-known/assetlinks.json`; if that repo also already hosts assetlinks for other apps, append a new target rather than overwriting. **If you're creating that repo fresh, also commit an empty `.nojekyll` file at the repo root; without it, Jekyll silently strips the `.well-known/` path from the Pages build and the URL returns 404 even though the file is in the repo.**
4. Set PASSKEY_RP_ID in the project's PasskeyConfig module to the chosen domain. Verify with `curl -I` against the live URL; then have the consumer reinstall the debug APK and tap Forge.

After EACH step, output a one-sentence summary of what just happened so the human can follow without reading every tool result. Pause for explicit approval before any git push to a repo other than the project itself, and before any adb install / uninstall.

Production release-keystore setup is out of scope."></div>

This is the **development-only** path. You run debug builds on your emulator or device, and Android Studio's auto-generated debug keystore signs them for you. There is no keystore generation, no `keystore.properties`, and no CI signing setup. It takes about 5 minutes end to end.

---

## Choose your rpId

Your `rpId` should be the GitHub Pages host of the user or organization that owns your project. Derive it from the project's git remote:

```bash
git remote -v
# origin  https://github.com/<user-or-org>/<repo>.git
```

From that:

- **Your `rpId`** is `<user-or-org>.github.io` (hostname only, no scheme, no path).
- **The repo that backs that rpId** is `<user-or-org>/<user-or-org>.github.io`. That exact, specially named repo is the only one whose `.well-known/assetlinks.json` is reachable at the URL the passkey API needs (`https://<user-or-org>.github.io/.well-known/assetlinks.json`).

For example, this project's origin is `github.com/kuiralabs/kuira-starter-android`, so its natural rpId is `kuiralabs.github.io` and assetlinks goes in `kuiralabs/kuiralabs.github.io`.

Check whether that repo already exists:

```bash
gh repo view <user-or-org>/<user-or-org>.github.io
```

If it doesn't, you create it in Step 3. To use a different domain (a custom domain you own, or a personal site that already hosts other apps), use that instead. The same constraints apply.

!!! danger "If you cloned the starter, change `PASSKEY_RP_ID`"
    The starter ships `PASSKEY_RP_ID = "kuiralabs.github.io"`. You **must** change it to a domain you host `assetlinks.json` on (Step 4), or every **Forge** fails with `RP_ID_MISMATCH`, because your debug fingerprint isn't in the `kuiralabs.github.io` assetlinks file.

---

## Step 1: Get the debug fingerprint

```bash
./gradlew :app:signingReport
```

!!! note "Configuration-cache gotcha"
    If your project sets `org.gradle.configuration-cache=true` in `gradle.properties`, `signingReport` fails with a class-loader error (`Class 'com.android.build.gradle.internal.dsl.SigningConfig$AgpDecorated' not found`). Run it with `--no-configuration-cache`:

    ```bash
    ./gradlew :app:signingReport --no-configuration-cache
    ```

Find the `Variant: debug` block. Copy its `SHA-256:` line (keep the colons):

```
Variant: debug
…
SHA-256: AB:CD:EF:12:34:…
```

---

## Step 2: Write `assetlinks.json`

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
        "AB:CD:EF:12:34:56:…"
      ]
    }
  }
]
```

Two fields:

- `package_name`: your app's `applicationId` from `app/build.gradle.kts`.
- `sha256_cert_fingerprints[0]`: the SHA-256 from Step 1.

Both relations are required. `get_login_creds` makes passkey ceremonies work; `handle_all_urls` lets the same file double as the App Links binding if you add deep links later.

---

## Step 3: Host it on your `rpId` domain

Path: `https://<rpId>/.well-known/assetlinks.json`. It must be served over HTTPS, with `Content-Type: application/json`, with no redirect, and with no auth wall.

You chose the rpId and backing repo in the **Choose your rpId** section above. There are two cases.

### Case A: the backing repo already exists

Clone it, append your new target to any existing `assetlinks.json` array (don't overwrite it, because other apps may already be bound to the same host), then commit and push:

```bash
gh repo clone <user-or-org>/<user-or-org>.github.io
cd <user-or-org>.github.io
# Edit .well-known/assetlinks.json: append your target object to the
# top-level JSON array. If the file doesn't exist yet, create it with
# just your target inside an array.
git add .well-known/assetlinks.json
git commit -m "passkey: bind <your-package-name>"
git push
```

### Case B: the backing repo doesn't exist yet

Create it, add the JSON **plus a `.nojekyll` marker**, push, and enable Pages:

```bash
gh repo create <user-or-org>/<user-or-org>.github.io --public --add-readme
gh repo clone <user-or-org>/<user-or-org>.github.io
cd <user-or-org>.github.io
mkdir -p .well-known
# Write .well-known/assetlinks.json with the JSON from Step 2.
touch .nojekyll
git add . && git commit -m "host assetlinks.json"
git push
```

!!! danger "Why `.nojekyll` matters"
    GitHub Pages's default static-site processor is Jekyll, which **silently excludes every dot-prefixed path** from the build output. Without `.nojekyll`, `.well-known/assetlinks.json` is in your repo and visible in the GitHub web UI, but the deployed Pages site returns `HTTP 404` for it.

    An empty `.nojekyll` file at the repo root tells Pages to skip Jekyll entirely and serve the repo's files verbatim. This is the universal fix for any Pages site that hosts a `.well-known/*` path: App Links, passkey assetlinks, ACME challenge files, `security.txt`, and so on.

    The symptom if you forget it: the apex `https://<name>.github.io/` returns 200 (Pages is live) and the file is present in the repo, but `curl -I https://<name>.github.io/.well-known/assetlinks.json` returns 404. To fix it, add `.nojekyll` and push again; the deploy re-runs in ~30 seconds.

For `<user-or-org>/<user-or-org>.github.io` repos, GitHub Pages turns on automatically for the default branch. If it didn't, set **Settings → Pages → Source: `main`** in the repo UI, or use the API:

```bash
gh api -X POST '/repos/<user-or-org>/<user-or-org>.github.io/pages' \
  -f 'source[branch]=main' -f 'source[path]=/'
```

Either way, GitHub Pages serves `.json` as `application/json` by default, with no extra config. The file is live at `https://<user-or-org>.github.io/.well-known/assetlinks.json` within ~30 seconds.

### Hosting elsewhere (Vercel / Cloudflare / nginx)

The same constraints apply (HTTPS, `Content-Type: application/json`, no redirects, and no auth). Put `assetlinks.json` at `/.well-known/assetlinks.json` of your hostname's web root. Platform-specific notes are out of scope here; the rest of the recipe is unchanged.

---

## Step 4: Point your app at the rpId, then verify

First, update your app's `PasskeyConfig` so the in-binary rpId matches the domain that now serves your `assetlinks.json`. In a starter built from `kuiralabs/kuira-starter-android`, that's the `PASSKEY_RP_ID` constant in `app/src/main/java/.../di/PasskeyConfigModule.kt`:

```kotlin
private const val PASSKEY_RP_ID = "<user-or-org>.github.io"
```

Then verify the hosting:

```bash
curl -I https://<user-or-org>.github.io/.well-known/assetlinks.json
# Expected:
# HTTP/2 200
# content-type: application/json
```

Then on device:

```bash
adb uninstall <your-package-name>          # if a previous build is installed
./gradlew :app:installDebug
```

Launch the app and tap **Forge**. You get a biometric prompt, it succeeds, and the Sigil panel transitions to `Forged`.

!!! warning "Uninstall before re-installing"
    `adb install -r` does NOT refresh credential-manager state on some devices. After hosting changes or rpId changes, always run `adb uninstall <pkg>` first.

---

## Troubleshooting

If Forge fails, almost every symptom maps to the same root cause:

| Symptom | First thing to check |
|---|---|
| `RP_ID_MISMATCH` | Does `curl -I` return 200 with `content-type: application/json`? |
| `PRF authentication failed` | Same check: the passkey API never reaches PRF if assetlinks doesn't validate. |
| Biometric prompt appears, dismisses silently | Same check |
| Worked before, broken after `adb install -r` | Run `adb uninstall <pkg>`, then re-install. Credential-manager state goes stale. |

Common `curl -I` red flags:

- `301` / `302`: the passkey API doesn't follow redirects. Fix the redirect.
- `403` / `401`: allow `/.well-known/*` through your auth.
- `content-type: text/html`: force `application/json` through your hosting config.
- `404` on GitHub Pages while the file IS in the repo: Jekyll silently stripped the `.well-known/` dotfile path. Add an empty `.nojekyll` at the repo root, push, and wait ~30s for the redeploy (see Step 3 Case B for the full explanation).
- `404` while the file is NOT in the repo, or the hostname is wrong: check that your push landed on the served branch, and that the `rpId` matches the hostname you `curl`ed.

If the `curl` output looks clean and Forge still fails, paste your hosting URL, package name, and fingerprint into Google's [Statement List Tester](https://developers.google.com/digital-asset-links/tools/generator). It reports any mismatch with a precise error string.

---

## When you ship

The setup above covers development with debug builds. To ship to the Play Store or distribute a signed release build to testers, you need a release keystore, `keystore.properties` wiring, and the release fingerprint added to the same `assetlinks.json`. This recipe doesn't cover that path; [`./gradlew :app:signingReport`](https://developer.android.com/build/building-cmdline#signing_report) and [the AGP signing config docs](https://developer.android.com/build/build-variants#signing) cover the missing pieces.

---

## What's next

- **[Set up Sigil identity](set-up-sigil-identity.md)**: now that the passkey domain is bound, wire `SigilStatusPanel` and forge your first sigil.
