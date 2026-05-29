---
title: Kuira SDK
hide:
  - navigation
---

# Kuira SDK

**The Android SDK for [Midnight](https://midnight.network) zero-knowledge dApps.**

Build privacy-first Android apps on Midnight: passkey-derived identity,
an embedded wallet, and a Compact contract runtime — added to your project
as a single Gradle dependency.

!!! warning "Alpha — `0.1.0-alpha01`"
    The API may change between alpha bumps. Production usage is not
    recommended; we're looking for early integrators who can give
    feedback. See [Security](security.md) for the threat model and
    vulnerability reporting.

---

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
        implementation("io.github.kuiralabs:dapp-ui:0.1.0-alpha01")
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
        implementation 'io.github.kuiralabs:dapp-ui:0.1.0-alpha01'
    }
    ```

`dapp-ui` `api`-exposes the consumer surface (`midnight-sdk`,
`wallet-runtime`, `identity`, `compact-engine`, …) so a single line gives
you the complete SDK graph.

[Full integration guide →](integration.md){ .md-button .md-button--primary }
[Browse the cookbook →](recipes/index.md){ .md-button }

---

## What's in the box

| Module | Coordinate |
|---|---|
| Umbrella dApp UI (sigil + wallet panels) | `io.github.kuiralabs:dapp-ui` |
| Headless SDK (wallet + contract calls) | `io.github.kuiralabs:midnight-sdk` |
| Wallet runtime & seed bootstrapping | `io.github.kuiralabs:wallet-runtime`, `:wallet-seed` |
| Passkey + sigil identity | `io.github.kuiralabs:identity`, `:auth` |
| Crypto primitives (BIP-39, BIP-32, Schnorr, Bech32m) | `io.github.kuiralabs:crypto` |
| Compact contract engine | `io.github.kuiralabs:compact-engine` |
| Indexer client + connector | `io.github.kuiralabs:indexer`, `:connector` |
| Ledger / network | `io.github.kuiralabs:ledger`, `:network` |
| Design system | `io.github.kuiralabs:designsystem` |
| Test fixtures | `io.github.kuiralabs:testing` |

All artifacts share the same version. Pulling `dapp-ui` brings the
needed subset transitively.

---

## Built for AI-assisted development

Every cookbook recipe carries a **:material-content-copy: Copy prompt
for your agent** button. Paste into Claude Code, Cursor, Codex, or any
LLM-driven assistant — the agent fetches a stable raw-markdown context
bundle directly from this site and has everything it needs to wire the
integration in your project.

An [`/llms.txt`](https://kuiralabs.github.io/kuira-sdk/llms.txt) at the
site root lists every recipe and context bundle URL, following the
emerging <https://llmstxt.org> convention. Agents that support it
auto-discover the entire cookbook in one fetch.

---

## Source code

The SDK source currently lives in a private repository. We're shipping
the published artifacts (binaries **and** Kotlin sources, via the
`-sources.jar` next to each AAR on Maven Central) so anyone can read,
audit, or debug into the code. Source-availability is part of the
trust contract — see [Security § Verifying releases](security.md#verifying-releases).

A staged public-source path is on the roadmap. We'll announce here when
the repository opens.

---

## License

Apache License 2.0 — see [LICENSE](https://github.com/kuiralabs/kuira-sdk/blob/main/LICENSE).
