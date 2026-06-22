# Kuira Android SDK

**Build [Midnight](https://midnight.network) zero-knowledge dApps on Android — proofs run on the phone.**

[![Maven Central](https://img.shields.io/maven-central/v/io.github.kuiralabs/dapp-ui?label=Maven%20Central&color=blue)](https://central.sonatype.com/artifact/io.github.kuiralabs/dapp-ui)

Privacy-first Android apps on Midnight: on-device ZK proving (no proof
server), passkey-derived identity, an embedded wallet, and the Compact
contract runtime — added to your project as a single Gradle dependency.

> **Status:** Alpha — latest version shown by the Maven Central badge above.
> The API may change between alpha
> bumps. Production usage is not recommended; we're looking for early
> integrators who can give feedback. See
> [SECURITY.md](https://github.com/kuiralabs/kuira-sdk-android/blob/main/SECURITY.md)
> for threat model and reporting.

---

## Install

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
}

// app/build.gradle.kts
dependencies {
    implementation("io.github.kuiralabs:dapp-ui:0.1.0-alpha04")
}
```

That's the full on-ramp. `dapp-ui` `api`-exposes the consumer surface
(`midnight-sdk`, `wallet-runtime`, `identity`, `compact-engine`, …) so a
single line gives you the complete SDK graph.

---

## Read next

- **[INTEGRATION.md](INTEGRATION.md)** — end-to-end recipe: prereqs,
  `PasskeyConfig` Hilt module, `assetlinks.json` hosting, a minimal
  "deploy a contract + call a circuit" skeleton, the troubleshooting
  table, and known limitations.
- **[API reference](https://kuiralabs.github.io/kuira-sdk-android/api/)** —
  Dokka-generated reference for every published module.

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

## Source code

The SDK source currently lives in a private repository. We're shipping
the published artifacts (binaries **and** Kotlin sources, via the
`-sources.jar` next to each AAR on Maven Central) so anyone can read,
audit, or debug into the code. Source-availability is part of the
trust contract — see [SECURITY.md](SECURITY.md) § *Verifying releases*.

A staged public-source path is on the roadmap. We'll announce here when
the repository opens.

---

## License

Apache License 2.0 — see [LICENSE](LICENSE).

---

## Maintainer

[nel349](https://github.com/nel349) — [kuiralabs@gmail.com](mailto:kuiralabs@gmail.com).
Security reports: see [SECURITY.md](SECURITY.md).
