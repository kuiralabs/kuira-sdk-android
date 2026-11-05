# Security policy

Kuira is a wallet and identity SDK for the Midnight blockchain on Android. Because it touches seed material, signing keys, and on-chain authority, we take security reports seriously. This document covers how to report vulnerabilities, what's in scope, and what isn't covered yet.

---

## Reporting a vulnerability

**Please report security issues privately.** Public GitHub issues are the wrong venue for unpatched vulnerabilities.

### How to reach us

- **GitHub Security Advisories** (preferred): <https://github.com/kuiralabs/kuira-sdk-android/security/advisories/new>. This private channel lets you and the maintainer collaborate on a fix before disclosure. GitHub encrypts it on its side.
- **Email:** `kuiralabs@gmail.com`. For PGP-encrypted reports, the maintainer's signing key (used for Maven Central artifacts) doubles as the security contact key. The public key is available on `keyserver.ubuntu.com`; see Verifying releases below for the fingerprint.

### What to include

- Affected versions: at minimum, the Maven coordinate (for example, `io.github.kuiralabs:midnight-sdk:{{ kuira_version }}`).
- Steps to reproduce, or a proof of concept.
- Your assessment of impact and exploitability.
- Whether you want public credit, and how you'd like to be named.

### Response timeline

| Stage | Target |
|---|---|
| Acknowledgement of report | within **72 hours** |
| Initial triage + severity assessment | within **1 week** |
| Fix or mitigation plan | within **30 days** for high/critical |
| Coordinated disclosure | within **90 days** of initial report, or sooner if a fix has shipped |

If 90 days pass without a fix or a mutually agreed extension, you're free to disclose publicly. We'd rather you do that than sit on an unfixed issue.

---

## Scope

### In scope

Vulnerabilities in code shipped under any of the published Maven artifacts:

```text
io.github.kuiralabs:midnight-sdk
io.github.kuiralabs:dapp-ui
io.github.kuiralabs:wallet-seed
io.github.kuiralabs:wallet-runtime
io.github.kuiralabs:identity
io.github.kuiralabs:auth
io.github.kuiralabs:crypto
io.github.kuiralabs:network
io.github.kuiralabs:compact-engine
io.github.kuiralabs:indexer
io.github.kuiralabs:connector
io.github.kuiralabs:ledger
io.github.kuiralabs:designsystem
io.github.kuiralabs:testing
```

We are particularly interested in issues that affect:

- **Key derivation and storage:** BIP-39, BIP-32, Schnorr, and Bech32m implementations, Android Keystore integration, `EncryptedSharedPreferences` usage, and seed wiping after use.
- **Passkey and sigil identity:** PRF derivation, DID generation, authorization payload signing, and Block Store backup encryption.
- **Transaction signing and proving:** anything that could produce an unintended on-chain effect.
- **Network surface:** the indexer and node clients (TLS pinning, replay, and response validation).
- **Hilt graph misconfigurations:** anything that could silently route authority through the wrong domain or the wrong key.

### Out of scope

Please report these to the appropriate upstream project, not to us:

- The Midnight protocol itself, the ledger, the node, the indexer, and the Compact compiler: report to <https://github.com/midnightntwrk>.
- Android OS, Keystore, and Credential Manager vulnerabilities: report to Google's Android Security team.
- Issues only reproducible on rooted devices, on emulators with debugging bridges, or after the user installs malicious apps. See Known limitations below.
- The Kuira wallet app (not yet published) and the public example dApps (BBoard, the Kuira Starter). These are reference implementations that demonstrate SDK usage, not production products.

---

## Threat model

### What Kuira protects against

- **Cold device theft:** Android Keystore encrypts seed material at rest (hardware-backed where available, falling back to TEE). A thief with the device but not the user's biometric or PIN cannot extract seeds.
- **Local file inspection:** Both the seed vault and the active-match and application-state store use `EncryptedSharedPreferences` with a Keystore-bound master key. Files in `/data/data/<pkg>/` are unreadable outside a Keystore-authenticated process.
- **Cloud backup interception:** The SDK **PRF-encrypts the Block Store backup blob client-side** before Google Block Store touches it. A Google account compromise alone doesn't yield wallet access: the attacker also needs to forge a passkey assertion on a device the user controls.
- **Replay across dApps:** Each consumer dApp supplies its own `PasskeyConfig` (`rpId` + `rpName`); the SDK does not ship a maintainer default. Two dApps using the same SDK get cryptographically distinct passkeys and cannot impersonate each other.
- **Accidental seed exposure in logs:** The SDK never logs seed or PRF-derived material. Debug log lines that touch sensitive material are gated behind `BuildConfig.DEBUG`, so R8 strips them from release builds.
- **Total device and account loss (opt-in sovereign exit):** A user who has exported their 24-word BIP-39 recovery phrase can restore the exact wallet on any device with no passkey, Google account, or cloud backup involved. The SDK derives the phrase on demand from the same entropy that backs the seed and never stores or uploads it. The reveal screen runs under `FLAG_SECURE` (no screenshots or recents thumbnail) with a clipboard that auto-clears.

### What Kuira does not protect against

- **Compromised device** (rooted, a malicious app with elevated privileges, or unlocked while the attacker has physical access): once malicious code in the same process can reach Keystore-bound keys, the seed vault is recoverable. No app-level mitigation defeats a compromised trusted execution environment.
- **Malicious dApp in the same process:** dApps that integrate the SDK share the same Android process. There is no inter-dApp sandboxing beyond Android's normal process isolation. Vet the dApps you integrate.
- **User-side passkey loss with no exported recovery phrase:** A sovereign exit exists: the user can reveal their 24-word BIP-39 recovery phrase (**Settings → recovery phrase**, biometric-gated) and restore the exact wallet on any device with no passkey, account, or backup involved. But it is **opt-in and one-way**. Until the user deliberately reveals the phrase and writes it down, recovery still depends on their Google Password Manager passkey and Block Store backup. A user who loses both the passkey and the backup, and never exported the phrase, has unrecoverable funds. (Sigil V2, announced on the [home page](index.md#whats-coming-next-sigil-v2), adds PIN-based recovery through an opaque cloud bucket as a separate track.)
- **Session-cache theft inside the unlock window:** Once a sigil session is unlocked, the decrypted seed lives in `MidnightSdkProvider`'s cached SDK instance, and value-bearing calls within the active window do not re-prompt for biometric. Auto-lock bounds that window: the session locks on an idle timeout, on backgrounding, on a device screen lock, and on a manual "lock now". A device borrowed while still unlocked remains a real risk until the lock fires.
- **BLS proving parameters supply chain:** The SDK fetches Midnight's protocol-level proving keys (BLS params plus the wallet, zswap, and Dust circuits) from `midnight-s3-fileshare-dev-eu-west-1`, a Midnight-team S3 bucket labeled "dev." A compromise of that bucket would let an attacker substitute proving keys. The [Integration guide](integration.md) documents this under Known limitations. Per-contract proving keys are unaffected, because each dApp hosts its own.
- **Network-level interception:** The SDK uses HTTPS for indexer and node RPC. It does not currently implement certificate pinning. A network-level adversary with a forged certificate (for example, from a compromised CA) could observe or alter RPC traffic. Certificate pinning is under consideration for after `1.0`.
- **Side-channel attacks on Keystore or TEE:** These are outside our threat model. We trust Android's threat model for the underlying hardware-backed key store. Report issues at that layer to Android Security.
- **Alpha API stability:** `0.1.x-alpha*` releases may have breaking API or behavioral changes. The semver guarantees of a `1.0.0` line do not apply. Pin exact versions in production usage.

---

## Supported versions

We backport security fixes only to versions still in active development. For an alpha SDK, that means **the most recent published alpha line.**

| Version | Status |
|---|---|
| `0.1.x-alpha*` | ✅ Supported: security fixes land in the next alpha bump |
| Older alphas | ❌ Not backported. Upgrade. |

When `1.0.0` ships, this table changes to a proper LTS or minor-version policy. Until then, **stay current**: there's no minor-version stability to rely on during alpha.

---

## Verifying releases

The maintainer's PGP key signs every Maven Central artifact. To verify a downloaded artifact:

**Key fingerprint:** `189C70EE67261AF5866CF1D052D6F3437CF490FA`

```bash
# Fetch the public key
gpg --keyserver keyserver.ubuntu.com --recv-keys 189C70EE67261AF5866CF1D052D6F3437CF490FA

# Download the artifact and its signature
ARTIFACT=midnight-sdk-{{ kuira_version }}.aar
curl -O https://repo1.maven.org/maven2/io/github/kuiralabs/midnight-sdk/{{ kuira_version }}/$ARTIFACT
curl -O https://repo1.maven.org/maven2/io/github/kuiralabs/midnight-sdk/{{ kuira_version }}/$ARTIFACT.asc

# Verify
gpg --verify $ARTIFACT.asc $ARTIFACT
```

A successful verification names the key as `Good signature from "nel349 <kuiralabs@gmail.com>"`. Any other outcome means the artifact does **not** correspond to a release the maintainer published. Do not use it.

The fingerprint is also published in this file and in the project's GitHub repository description, so an attacker would have to compromise both this repository and the keyserver to substitute a key undetected.

---

## Disclosure policy

We follow **coordinated disclosure**:

- You report; the maintainer acknowledges and triages.
- The maintainer prepares a fix and a draft advisory.
- The maintainer sets a target disclosure date (within the 90-day window, or sooner if the fix is ready).
- On the disclosure date, a patched release ships, the advisory is published through GitHub Security Advisories, the [changelog](changelog.md) names the affected versions, and, if you wish, you receive credit by name.

If the issue is being actively exploited in the wild, the timeline compresses. Tell us if you have reason to believe that's the case.

---

## Acknowledgments

We thank the following researchers for responsibly disclosing vulnerabilities. (The hall of fame opens with the first report.)

| Researcher | Issue | Disclosed in |
|---|---|---|
| *(none yet)* | | |

---

## Out-of-scope but appreciated

Even if a report doesn't qualify as a security vulnerability (typos in crypto code, missing input validation that isn't exploitable, or hardening suggestions), open a regular GitHub issue or PR. We still want to know.

---

## See also

- [Integration guide](integration.md): known operational limitations for consumers (BLS-params dependency, debug-cleartext requirement, and others).
- [Home](index.md): install instructions and SDK overview.
