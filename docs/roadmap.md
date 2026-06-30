# Roadmap

What the SDK does today, and what's next — checked against the published
`{{ kuira_version }}`.

<span class="kuira-pill kuira-pill--ok">Shipped</span> works now ·
<span class="kuira-pill">In progress</span> has the core in place, full scope still landing ·
<span class="kuira-pill kuira-pill--soon">Planned</span> is on the way.

---

## Shipped <span class="kuira-pill kuira-pill--ok">alpha04</span>

**Identity & onboarding**

- **Single-biometric onboarding** — one prompt forges the passkey, identity, and wallet seed (graceful two-prompt fallback on older authenticators).
- **Hardened identity UX** — an overwrite guard so a Sigil can't be replaced by a stray tap, in-app sign-out, and sign-in with an existing passkey.
- **Per-domain Sigil identity** — each dApp binds its own passkey domain (`rpId`, no shared default); apps under the **same** domain share one Sigil, so a user's identity carries across sibling apps instead of minting a duplicate.
- **Sovereign recovery phrase** — reveal a standard 24-word BIP-39 phrase and restore the exact wallet on any device, biometric-gated, on a `FLAG_SECURE` screen.
- **Session auto-lock** — idle, background, and screen-lock re-authentication, plus a manual "lock now".

**Contracts**

- **Typed ledger reads** — `ledger().getUint64(…)` returns typed, validated state instead of hand-parsed cell hex.
- **Reactive contract state** — `observeLedger()`, a `Flow` of ledger snapshots pushed by block subscriptions (not polling).
- **Resilient & idempotent calls** — built-in retry through the indexer-lag window after deploy, and `callIdempotent` that no-ops when the chain already reflects the transition.
- **Multi-step protocol helper** — declare each step with a "done?" predicate; the saga resumes from the right step after process death.
- **Contract Gradle plugin** — syncs compiled `.compact` artifacts, generates typed circuit calls, and enforces the runtime-version pin at build time.

**Backup & sync**

- **Cross-device wallet backup** — encrypt-on-device dust checkpoint to the user's own cloud, restored on a new device from the same Sigil.
- **Automatic app-state backup** — silent and no-prompt; fires on each sync and skips unchanged blobs by hash.
- **Cloud-backup controls** — fully disable dust and app-state backups; disabling deletes the remote blobs (the cloud grant is kept, so re-enabling is instant).
- **Proactive Dust sync** — delta re-sync on each chain-tip advance, so a transaction rarely waits on a cold sync.
- **Streamed cold sync** — shielded-state cold sync streams to disk to avoid GC pauses and UI freezes on the first sync.

**Developer experience & UI**

- **One Gradle line** — `dapp-ui` `api`-exposes the full module graph; drop to `midnight-sdk` for headless.
- **`kuiraDoctor` preflight** — build-time checks (assetlinks reachability, runtime pin, debug-cleartext, …) that fail fast instead of crashing at runtime.
- **Floating wallet & sigil pills** — opt-in draggable chips that dock to a screen edge as peek tabs.
- **Themeable wallet UI** — seven built-in palettes (Kuira Monochrome, Paper, Catppuccin, Nord, Dracula, Tokyo Night, Rosé Pine), persisted.
- **Frosted-glass design system** — reusable `GlassPanel` surfaces over an animated starfield.
- **Redesigned send flow** — amount presets, a clearer review step, and honest in-flight copy.
- **Receive notifications** — background push when NIGHT arrives, carrying the real per-transaction amount.

---

## In progress <span class="kuira-pill">building</span>

The core is shipped and usable; the full scope below is still landing.

- **Read-only contract factory** — state-watching works today by building a contract with no wallet attached; a dedicated read-only factory is next.
- **Delegated access keys** — the key model, permission scopes (silent / notify / approve), expiry, and encrypted store are in place; the end-to-end "grant a scoped, time-bounded key to a remote agent" flow isn't wired into a single call yet.
- **One-call proving-key setup** — wallet keys (with BLS params) and a contract's circuit keys each stage in one call; a single combined entry point is the remaining piece.
- **Compound-witness factories** — some timing helpers ship today (`waitForFunding`, indexed-state waits); typed factories for compound (struct) witness types are next.

---

## Planned <span class="kuira-pill kuira-pill--soon">next</span>

- **Typed ledger classes** — generated `ledger.p1Score` accessors checked at compile time (typed *circuit* calls already generate; ledger codegen is the next step).
- **Contract testing artifacts** — a fake contract with canned ledger snapshots, so you can unit-test your state machine without a live chain or prover.
- **Published on-device proving benchmarks** — reproducible latency on named hardware. We won't publish a number without a measurement behind it.
- **Long-term archive tier** — an encrypted archive for history and stats beyond the device-transfer vault's budget.
- **Cross-domain identity (Sigil V2)** — carry one identity (and its wallet state) across apps on *different* domains, and hold more than one Sigil. Today a Sigil is shared only within a single `rpId` domain; spanning domains needs the planned seed-as-data model.

---

*This is a direction, not a commitment to dates or ordering — items land as real apps prove the need.*
