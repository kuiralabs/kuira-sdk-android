---
title: Kuira Android SDK
hide:
  - navigation
  - toc
---

<section class="kuira-hero" markdown>
<canvas class="kuira-hero__canvas" data-component="starfield" aria-hidden="true"></canvas>

<div class="kuira-hero__inner" markdown>
<div class="kuira-hero__eyebrow"><span>Kuira · v{{ kuira_version }}</span><span>Maven Central</span></div>

<h1 class="kuira-hero__headline">The first Android SDK <em>built for AI-paired development.</em></h1>

<p class="kuira-hero__lede">
Midnight zero-knowledge dApps on Android — passkey identity, embedded wallet, Compact contract runtime. Every recipe ships with a one-tap prompt for your coding agent.
</p>

<div class="kuira-hero__cta">
<a href="recipes/" class="md-button md-button--primary">Browse the cookbook</a>
<a href="integration/" class="md-button">Read the integration guide</a>
</div>
</div>
</section>

<section class="kuira-picker" id="kuira-picker" markdown>
<div class="kuira-picker__header" markdown>
<h2 class="kuira-picker__title">Try the agent-mode workflow</h2>
<p class="kuira-picker__subtitle">
Pick a task and an agent. We generate the prompt; you paste it into your tool. Same prompt structure every recipe ships with.
</p>
</div>

<div class="kuira-picker__row" markdown>
<span class="kuira-picker__label">What do you want to build?</span>
<div class="kuira-picker__options" role="radiogroup" aria-label="Recipe">
<button class="kuira-picker__chip" type="button" role="radio" aria-pressed="true" data-task-key="add-kuira-to-an-android-project" data-task-title="Add the Kuira SDK">Add Kuira to a project</button>
<button class="kuira-picker__chip" type="button" role="radio" aria-pressed="false" data-task-key="set-up-sigil-identity" data-task-title="Set up Sigil identity">Set up Sigil identity</button>
<button class="kuira-picker__chip" type="button" role="radio" aria-pressed="false" data-task-key="deploy-and-call-a-compact-contract" data-task-title="Deploy a Compact contract and call a circuit">Deploy a Compact contract</button>
</div>
</div>

<div class="kuira-picker__row" markdown>
<span class="kuira-picker__label">For your agent</span>
<div class="kuira-picker__options" role="radiogroup" aria-label="Agent">
<button class="kuira-picker__chip" type="button" role="radio" aria-pressed="true" data-agent-key="claude" data-agent-name="Claude Code">Claude Code</button>
<button class="kuira-picker__chip" type="button" role="radio" aria-pressed="false" data-agent-key="cursor" data-agent-name="Cursor">Cursor</button>
<button class="kuira-picker__chip" type="button" role="radio" aria-pressed="false" data-agent-key="codex" data-agent-name="Codex">Codex</button>
<button class="kuira-picker__chip" type="button" role="radio" aria-pressed="false" data-agent-key="generic" data-agent-name="any LLM">Generic LLM</button>
</div>
</div>

<div class="kuira-picker__output" markdown>
<span class="kuira-picker__label">Your prompt</span>
<pre class="kuira-picker__prompt" id="kuira-picker-output" aria-live="polite">Building prompt…</pre>
<div class="kuira-picker__actions">
<button class="kuira-picker__action kuira-picker__action--primary" type="button" id="kuira-picker-copy"><span aria-hidden="true">📋</span> Copy prompt</button>
<a class="kuira-picker__action" id="kuira-picker-raw" href="#" target="_blank" rel="noopener"><span aria-hidden="true">📄</span> View raw context bundle</a>
</div>
</div>
</section>

<section class="kuira-features" markdown>
<article class="kuira-feature" markdown>
<span class="kuira-feature__eyebrow">Identity</span>
<h3 class="kuira-feature__title">Passkey-derived sigil</h3>
<p class="kuira-feature__body">
One biometric mints a DID + wallet seed. PRF on the passkey assertion — no seed phrases at onboarding, recoverable on any device that shares the Google account.
</p>
</article>
<article class="kuira-feature" markdown>
<span class="kuira-feature__eyebrow">Wallet</span>
<h3 class="kuira-feature__title">Embedded, no custodian</h3>
<p class="kuira-feature__body">
Shielded + unshielded balance, transaction balancing, indexer sync, Dust regeneration. The wallet lives in your app's process; you never call out to a separate wallet.
</p>
</article>
<article class="kuira-feature" markdown>
<span class="kuira-feature__eyebrow">Contracts</span>
<h3 class="kuira-feature__title">Compact runtime + ZK proving</h3>
<p class="kuira-feature__body">
Deploy and call Compact circuits on-device. QuickJS contract runtime, witness packing, per-circuit proving keys, transaction submission — wired by a Gradle plugin.
</p>
</article>
</section>

<section class="kuira-modules" markdown>
<div class="kuira-modules__title">16 modules · pull <code>dapp-ui</code>, get the graph</div>
<div class="kuira-modules__list">
<span class="kuira-modules__pill">dapp-ui</span>
<span class="kuira-modules__pill">midnight-sdk</span>
<span class="kuira-modules__pill">wallet-runtime</span>
<span class="kuira-modules__pill">wallet-seed</span>
<span class="kuira-modules__pill">identity</span>
<span class="kuira-modules__pill">auth</span>
<span class="kuira-modules__pill">crypto</span>
<span class="kuira-modules__pill">compact-engine</span>
<span class="kuira-modules__pill">indexer</span>
<span class="kuira-modules__pill">connector</span>
<span class="kuira-modules__pill">ledger</span>
<span class="kuira-modules__pill">network</span>
<span class="kuira-modules__pill">wallet</span>
<span class="kuira-modules__pill">designsystem</span>
<span class="kuira-modules__pill">testing</span>
<span class="kuira-modules__pill">contract-plugin</span>
</div>
</section>

## Install

=== "Gradle (Kotlin DSL)"

    ```kotlin
    // settings.gradle.kts
    dependencyResolutionManagement {
        repositories {
            mavenCentral()
        }
    }

    // app/build.gradle.kts
    dependencies {
        implementation("io.github.kuiralabs:dapp-ui:{{ kuira_version }}")
    }
    ```

=== "Gradle (Groovy)"

    ```groovy
    // settings.gradle
    dependencyResolutionManagement {
        repositories {
            mavenCentral()
        }
    }

    // app/build.gradle
    dependencies {
        implementation 'io.github.kuiralabs:dapp-ui:{{ kuira_version }}'
    }
    ```

`dapp-ui` `api`-exposes the consumer surface, so a single line gives
you the complete SDK graph. Need just the headless wallet? Use
`midnight-sdk` instead.

[Full integration guide →](integration.md){ .md-button .md-button--primary }
[Security & verification](security.md){ .md-button }

---

## Built for AI-assisted development

The cookbook is the source of truth for both humans and agents. Every
recipe is a raw markdown file at a stable URL — agents fetch it
directly. A site-root [`/llms.txt`](llms.txt) lists every recipe, per
the emerging [llms.txt](https://llmstxt.org) convention.

For maintainers: the SDK source lives in a private repository. Source
jars ship next to every AAR on Maven Central, so you can read, audit,
or step into the implementation through any IDE.

---

## Known limitations · {{ kuira_version }}

Honest naming of where the SDK doesn't go yet. None of these block the
"identity + wallet + contract call" core path; each will close in a
tracked future cycle.

| Gap | Workaround today | Closes in |
|---|---|---|
| **No Compact authoring tooling** — recipes assume you already have a compiled `.compact` contract under `contract/src/managed/<name>/`; the SDK does not teach how to write `.compact`, install `compactc`, or pin `@midnight-ntwrk/compact-runtime`. | Clone an example contract from [midnightntwrk](https://github.com/midnightntwrk) or a Midnight fellowship project. | `alpha02` — **Hello Compact** recipe in flight |
| **Contract Gradle plugin not on Maven Central yet** — `com.midnight.kuira.contract` was authored during the alpha02 cycle and has never been published. | Recipe 3 ships a hand-rolled `syncContractAssets` `Copy` task in tab 2; identical asset output, 30 more lines. | `alpha02` |
| **No recovery-phrase export (BIP-39 mnemonic)** — sigil-derived wallets currently have no sovereign exit; recovery rides Google account availability. | Don't lose your Google account. PRF derivation is deterministic if you can replay the passkey. | `alpha03` (wishlist `#24`) |
| **No session auto-lock** — once a sigil session is unlocked, value-bearing calls don't re-prompt biometric until the process is killed. | Treat unlocked sessions as funds-on-screen. Use sign-out from the Sigil panel to terminate manually. | `alpha03` (wishlist `#14`) |
| **SDK source not on GitHub** — the monorepo is private. The Dokka API reference doesn't link to source. | `-sources.jar` ships next to every artifact on Maven Central. IDEs (Android Studio, IntelliJ) auto-attach sources and you can step into the implementation as usual. | TBD — strategy decision |
| **BLS proving params from Midnight's dev S3 bucket** — `midnight-s3-fileshare-dev-eu-west-1`. A supply-chain assumption labeled "dev." | None — documented at the protocol-team layer; per-contract proving keys are unaffected (each dApp hosts its own). | When Midnight publishes a production URL |
| **Android only** — no iOS, no React Native bridge, no JS interop. | If you need cross-platform, build the same surface twice for now. | iOS spike planned post-`alpha02` |
| **No `kuira doctor` preflight checks** — environment misconfigurations (`assetlinks.json` unreachable, `compactc` runtime mismatch, missing debug-cleartext manifest) surface as runtime errors instead of build-time gates. | Read recipe troubleshooting tables; the SDK throws targeted exceptions with cause descriptions. | `alpha03` (DevX wishlist `#8`) |

For **security-domain gaps** — what the threat model does and doesn't
cover (compromised devices, malicious co-process dApps, session-cache
theft) — see [Security](security.md) § *What Kuira does NOT protect
against*.

---

## License

Apache License 2.0 — see [LICENSE](https://github.com/kuiralabs/kuira-sdk-android/blob/main/LICENSE).
