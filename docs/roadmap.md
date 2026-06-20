# Roadmap

Where the Kuira Android SDK is headed. These are the capabilities we're
building toward so each new dApp writes less plumbing and more product. It's
intentionally broader than any single release — items land as real apps prove
the need.

This is a direction, not a commitment to dates or ordering.

---

## Recently shipped

- **Sovereign recovery phrase** — the user can reveal a standard 24-word BIP-39
  phrase and restore the exact wallet on any device with no passkey, account, or
  backup in the loop; opt-in, one-way, biometric-gated, shown on a `FLAG_SECURE`
  screen with an auto-clearing clipboard. A public `WalletRecovery` contract lets
  a dApp build its own reveal/restore UI instead of the bundled Settings panel.
- **Session auto-lock** — the unlocked sigil session locks on an idle timeout, on
  backgrounding, and on a device screen-lock, plus a manual "lock now", so the
  decrypted seed isn't cached open indefinitely on a borrowed device.
- **Lossless typed ledger reads** — `MidnightContract.ledger()` returns typed,
  validated contract state (`getUint64`, `getBoolean`, `getBytes`, `getVectorUint8`,
  …) instead of hand-parsed cell hex.
- **Contract asset Gradle plugin** — `io.github.kuiralabs.contract` syncs your
  compiled Compact artifacts into the app's assets in the layout the SDK expects,
  and fails the build early on a runtime-version mismatch.
- **Cross-device wallet backup** — encrypt-on-device dust-checkpoint backup to
  Google Drive, restored on a new device from the same Sigil.
- **`kuiraDoctor` preflight** — build-time checks (minSdk, debug-cleartext,
  `assetlinks.json` reachability, Compact runtime pin, bundled-runtime layer) that
  catch misconfigurations before they ship.
- **Floating wallet & sigil pills** — opt-in draggable wallet and sigil chips
  (`PanelBar(floating = true)`) that dock to a screen edge as peek tabs and resize on
  long-press, so a dApp gets a movable wallet/identity surface with no custom UI.
- **Themeable wallet UI** — a settings palette picker with built-in themes (Kuira
  Monochrome, Catppuccin, Nord, Dracula, Tokyo Night, Rosé Pine), persisted across restarts.
- **Frosted-glass design system** — reusable `GlassPanel` frost components over an
  animated starfield, shared across the wallet, settings, and recovery screens.
- **Redesigned send flow** — amount presets, a clearer review step, and honest in-flight
  copy ("could take longer; keeps running if you leave").
- **Receive notifications** — background push when NIGHT arrives, carrying the real
  per-transaction amount from UTXO provenance (no false "change" alerts).
- **Faster, streamed cold sync** — shielded-state cold sync streams to disk to avoid GC
  pauses and UI freezes on the first sync.
- **Cloud-backup controls** — fully disable dust and app-state cloud backups; disabling
  revokes the cloud grant and deletes the remote blobs.

## Contract ergonomics

- **Typed ledger classes** generated from your `.compact` — `ledger.p1Score`
  instead of `ledger.getUint64("p1Score")`, checked at compile time.
- **Reactive contract state** — a `Flow` of ledger snapshots backed by block
  subscriptions, so your UI reacts to on-chain changes instead of polling.
- **Read-only contracts** — a dedicated factory for state-watching contracts with
  no wallet attached, so the read-only shape is correct by construction.
- **Resilient calls** — built-in retry/backoff for the common "indexer hasn't
  caught up yet" window after deploy, and idempotent calls that no-op when the
  chain already reflects the transition.
- **Multi-step protocol helper** — declare each step with a precondition and a
  "done?" predicate; the SDK resumes from the right point after process death.
- **Witness & timing helpers** — typed factories for compound witness types and
  helpers for deadlines and indexer-settle waits.
- **Testing artifacts** — a fake contract with canned ledger snapshots so you can
  unit-test your state machine without a live chain or proving stack.

## Wallet security & recovery

- **Session auto-lock** — idle, background, and screen-lock re-authentication, plus
  a manual "lock now", so a value-bearing call can't run unattended.
- **Recovery-phrase export** — reveal the wallet's BIP-39 phrase behind biometrics,
  so users have a sovereign exit independent of any platform account.
- **Hardened identity UX** — guardrails so a Sigil can't be replaced by an
  accidental tap, in-app sign-out, and sign-in with an existing passkey.
- **Single-biometric onboarding** — one prompt to forge a Sigil on authenticators
  that support it.

## Open, permissionless integration

- **Host-owned passkey domains** — every dApp supplies its own passkey
  configuration with no shared default, so integration never depends on another
  app's domain.
- **Identity selection** — choose which identity backs a Sigil at creation time,
  and manage more than one.
- **Delegated access keys** — scoped, time-bounded authorization for a separate
  key (e.g. a remote agent) to act on a Sigil's behalf.

## Proving & performance

- **One-call proving-key setup** — a single entry point that fetches the right BLS
  parameters and stages a contract's circuit keys from assets, so the first call
  proves without manual setup.
- **Published on-device proving benchmarks** — reproducible latency figures across
  real devices and circuit sizes (we don't publish a number without a measurement
  behind it).

## Backup & sync

- **Faster Dust sync** — proactive background sync and tip-aware caching so a
  transaction is rarely waiting on a cold sync, with clear progress while it runs.
- **Long-term archive tier** — an encrypted archive for history and stats beyond
  the device-transfer vault's budget.
- **Automatic backup** — silent, no-prompt capture of app state as it changes.
- **Cross-app state** *(future)* — sibling apps that share an identity sharing one
  wallet's state, gated on the identity model.
