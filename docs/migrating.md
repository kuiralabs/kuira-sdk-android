# Migration prompts

Moving between Kuira versions is a copy-paste job for your coding agent. Grab the prompt for your version jump, paste it into your agent (Claude Code, Cursor, Codex, or anything else), and it applies the changes using the live [changelog](changelog.md) as the source of truth.

## alpha04 → alpha05

Adds typed contract reads, the unshielded money path, constructor arguments, multi-contract projects, and live-chain reliability hardening. One breaking change: `close()` is now `suspend`.

```text
Upgrade this Android project from Kuira SDK 0.1.0-alpha04 to 0.1.0-alpha05.

1. Read the exact delta. See the [0.1.0-alpha05] section of:
   https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/changelog.md

2. Bump every io.github.kuiralabs:* dependency and the io.github.kuiralabs.contract
   and io.github.kuiralabs.localnet Gradle plugins from 0.1.0-alpha04 to 0.1.0-alpha05.

3. Apply the one breaking change: MidnightSdk.close() and MidnightWallet.close() are now
   suspend. Wrap any direct .close() call in a coroutine (or make the caller suspend).
   MidnightSdkProvider.close() is unchanged, so teardown through the provider needs no change.

4. Recommended: adopt the new typed contract reads. The contract Gradle plugin now generates
   a typed <Name>Contract facade. Prefer MyContract(handle).ledger().<field> and the generated
   read<Name>() / local<Name>() over name-keyed ledger().getUint64("...").

5. Recommended: if your activity root has a bare SessionLockGate { }, swap it for
   WalletAppShell { } to add the floating wallet + sigil overlay host. WalletAppShell wraps
   SessionLockGate, so SessionLockGate still works on its own if you don't want the overlays.

6. version-coherence preflight and dust-sync reliability land automatically, no code change.

Then run ./gradlew assembleDebug and fix any compile errors.
```
