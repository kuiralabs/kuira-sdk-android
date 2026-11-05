# Roadmap

What the SDK does today and what comes next, checked against the published `{{ kuira_version }}`.

<span class="kuira-pill kuira-pill--ok">Shipped</span> works now ·
<span class="kuira-pill">In progress</span> has the core in place, full scope still landing ·
<span class="kuira-pill kuira-pill--soon">Planned</span> is on the way.

---

## Shipped <span class="kuira-pill kuira-pill--ok">alpha05</span>

**Identity & onboarding**

- **Single-biometric onboarding:** one prompt creates the passkey, identity, and wallet seed (with a two-prompt fallback on older authenticators).
- **Hardened identity UX:** an overwrite guard so a stray tap can't replace a Sigil, in-app sign-out, and sign-in with an existing passkey.
- **Per-domain Sigil identity:** each dApp binds its own passkey domain (`rpId`, no shared default). Apps under the **same** domain share one Sigil, so a user's identity carries across sibling apps instead of minting a duplicate.
- **Sovereign recovery phrase:** reveal a standard 24-word BIP-39 phrase and restore the exact wallet on any device, biometric-gated, on a `FLAG_SECURE` screen.
- **Session auto-lock:** idle, background, and screen-lock re-authentication, plus a manual "lock now".

**Contracts**

- **Typed contract API:** the contract Gradle plugin generates a `<Name>Contract` facade from `contract-info.json`, with typed `call` / `read` / `local` methods that use your circuit's real argument and return types (`BigInteger`, `ByteArray`, generated `data class`es / `enum`s, `List<T>`, and tuples) and range-check `Uint` args to their declared width. A wrong type is a compile error.
- **Typed ledger snapshot:** the same facade's `ledger()` returns a typed `<Name>Ledger` with a `val` per exported ledger field (Counter and Cell), decoded and validated, instead of `getUint64("count")` by name.
- **Reactive contract state:** `observeLedger()` is a `Flow` of ledger snapshots (typed or raw) pushed by block subscriptions instead of polling.
- **Resilient and idempotent calls:** built-in retry through the indexer-lag window after deploy, and `callIdempotent`, which does nothing when the chain already reflects the transition.
- **Multi-step protocol helper:** declare each step with a "done?" predicate, and the saga resumes from the right step after process death.
- **Contract Gradle plugin:** syncs compiled `.compact` artifacts, drives the codegen above, and enforces the runtime-version pin at build time.
- **Unshielded value movement:** contract calls and withdrawals move real UTXO-backed NIGHT as well as shielded state.
- **Constructor arguments:** deploy a contract with constructor args, typed through the same codegen.
- **Multi-contract projects:** a `contracts { }` DSL builds and namespaces several contracts in one app, each with its own generated package and assets.
- **Local and batched reads:** `readLocal` runs a pure circuit against initial state with no deploy or chain; `readMany` batches several view reads on one snapshot.

**Backup & sync**

- **Cross-device wallet backup:** the dust checkpoint is encrypted on the device, stored in the user's own cloud, and restored on a new device from the same Sigil.
- **Automatic app-state backup:** runs silently with no prompt, fires on each sync, and skips unchanged blobs by hash.
- **Cloud-backup controls:** fully disable dust and app-state backups. Disabling deletes the remote blobs (the cloud grant is kept, so re-enabling is instant).
- **Proactive Dust sync:** delta re-sync on each chain-tip advance, so a transaction rarely waits on a cold sync.
- **Streamed cold sync:** shielded-state cold sync streams to disk to avoid GC pauses and UI freezes on the first sync.

**Developer experience & UI**

- **One Gradle line:** `dapp-ui` `api`-exposes the full module graph; use `midnight-sdk` instead for headless apps.
- **`kuiraDoctor` preflight:** build-time checks (assetlinks reachability, runtime pin, debug-cleartext, …) that fail fast instead of crashing at runtime.
- **Floating wallet and sigil pills:** opt-in draggable chips that dock to a screen edge as peek tabs.
- **Themeable wallet UI:** seven built-in palettes (Kuira Monochrome, Paper, Catppuccin, Nord, Dracula, Tokyo Night, and Rosé Pine), persisted.
- **Frosted-glass design system:** reusable `GlassPanel` surfaces over an animated starfield.
- **Redesigned send flow:** amount presets, a clearer review step, and honest in-flight copy.
- **Receive notifications:** background push when NIGHT arrives, carrying the real per-transaction amount.

---

## In progress <span class="kuira-pill">building</span>

The core is shipped and usable; the full scope below is still landing.

- **Read-only contract factory:** you can watch state today by building a contract with no wallet attached; a dedicated read-only factory is next.
- **Delegated access keys:** the key model, permission scopes (silent / notify / approve), expiry, and encrypted store are in place. The end-to-end flow that grants a scoped, time-bounded key to a remote agent isn't wired into a single call yet.
- **One-call proving-key setup:** wallet keys (with BLS params) and a contract's circuit keys each stage in one call; a single combined entry point is the remaining piece.
- **Compound-witness factories:** some timing helpers ship today (`waitForFunding`, indexed-state waits); typed factories for compound (struct) witness types are next.

---

## Planned <span class="kuira-pill kuira-pill--soon">next</span>

- **Typed ledger ADTs:** the ledger snapshot types Counter and Cell fields today; typed `Map`/`Set` reads (lookup / membership / size) are the remaining ledger shape. (Most contracts already expose these through view circuits, which the facade generates as `read<Name>()`.)
- **Contract testing artifacts:** a fake contract with canned ledger snapshots, so you can unit-test your state machine without a live chain or prover.
- **Proving benchmarks on more devices:** [On-device proving](on-device-proving.md) publishes measured figures for one flagship phone; a mid-range floor is not measured yet.
- **Long-term archive tier:** an encrypted archive for history and stats beyond the device-transfer vault's budget.
- **Cross-domain identity (Sigil V2):** carry one identity (and its wallet state) across apps on different domains, and hold more than one Sigil. Today a Sigil is shared only within a single `rpId` domain; spanning domains needs the planned seed-as-data model.

---

*This is a direction, not a commitment to dates or ordering. Items land as real apps prove the need.*
