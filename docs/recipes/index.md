---
title: Cookbook
hide:
  - toc
tags:
  - cookbook
---

# Cookbook

Hand-authored recipes that take you from "I have an Android project" to "I shipped a Midnight dApp." Each recipe is a step-by-step runbook with a verification gate after every meaningful step, written so a human or an LLM-driven agent can follow it.

Every recipe page has a **:material-content-copy: Copy prompt for your agent** button. The button copies a templated prompt that points your agent (Claude Code, Cursor, Codex, or another) at the raw Markdown context bundle for that recipe. Paste the prompt into your agent and let it execute the recipe in your project.

!!! tip "Why agent-friendly?"
    Each recipe's raw `.md` source is the same content the rendered page shows, so the agent doesn't need to scrape HTML or guess at structure. A site-root [`/llms.txt`](../llms.txt) lists every recipe, so any LLM-aware tool that supports the [llms.txt convention](https://llmstxt.org) discovers the full cookbook in one fetch.

---

## Recipes

<div class="grid cards" markdown>

-   :material-package-down: **[Add Kuira to an Android project](add-kuira-to-an-android-project.md)**

    ---

    Install the SDK, set your passkey `rpId`, and configure the Hilt module. ~10 minutes.

-   :material-key-chain: **[Bind your app to a passkey domain](bind-your-app-to-a-passkey-domain.md)**

    ---

    Get the debug signing fingerprint, write a single-fingerprint `assetlinks.json`, host it on your `rpId`, and verify Forge works on device. Development only: release signing is a separate future recipe.

-   :material-fingerprint: **[Set up Sigil identity](set-up-sigil-identity.md)**

    ---

    Bootstrap a passkey-derived sigil session: a DID and wallet seed from a single biometric. ~15 minutes.

-   :material-palette: **[Theme the wallet & sigil panels](theme-the-wallet-panel.md)**

    ---

    Brand the drop-in pills: colour through a custom `WalletPanelColors`, typeface through an inherited `LocalTextStyle`. The panel is brand-neutral and takes your theme. ~10 minutes.

-   :material-language-typescript: **[Hello Compact: write your first contract](hello-compact.md)**

    ---

    The 6-line counter that ships with the `kuira-starter-android` template, walked through line by line: toolchain pinning, compiling, and `mn contract inspect` verification. For deeper Compact learning, the recipe points to the official Midnight examples.

-   :material-file-document-multiple: **[Deploy and call a Compact contract](deploy-and-call-a-compact-contract.md)**

    ---

    Compile a `.compact` contract, sync artifacts into your assets, deploy through the SDK, and call a circuit. ~30 minutes.

-   :material-stethoscope: **[Run kuiraDoctor before each release](run-kuira-doctor.md)**

    ---

    The `kuiraDoctor` Gradle task runs five preflight checks that catch misconfigurations at build time (`assetlinks.json` reachability and `applicationId` match, `minSdk` floor, debug-cleartext manifest, Compact runtime pin, and SDK-bundled-runtime layer) before they surface as runtime crashes on a user's device. Run it before each release.

-   :material-cloud-sync: **[Back up wallet data across devices](back-up-wallet-across-devices.md)**

    ---

    Register a Google Cloud OAuth client for the `drive.appdata` scope so the wallet's encrypted sync state travels through the user's own Drive to a new device, giving a fast delta restore instead of a full genesis replay. Covers the `appDataFolder` invisibility and the same-account caveat.

-   :material-key-variant: **[Reveal & restore the recovery phrase](reveal-and-restore-the-recovery-phrase.md)**

    ---

    Build your own 24-word reveal and restore on the `WalletRecovery` contract. You own the secure screen (`FLAG_SECURE`, clipboard policy, and timing) while the SDK owns the crypto. Also covers tuning the session auto-lock that scrubs a revealed phrase.

</div>

---

## Recipe conventions

Every recipe page follows the same shape, which makes the pages predictable for both humans and agents:

| Section | Purpose |
|---|---|
| **Frontmatter** | Machine-readable metadata: tags, prerequisites, and raw-bundle URL. |
| **Outcome** | One sentence: what the developer has at the end. |
| **Prerequisites** | What must be true before starting. |
| **Steps** | Numbered, each with code + a *Verify* gate. |
| **Troubleshooting** | Common failures + their fixes. |
| **Agent prompt** | The :material-content-copy: button at the top of every recipe. |

If the cookbook framework grows to include session state, live-step gates, or CLI-based verifiers in a future release, the existing recipes keep working: the new machinery layers on top without rewriting the content.
