---
title: Theme the wallet & sigil panels
tags:
  - ui
  - theming
  - compose
prerequisites:
  - Kuira added to your project (see "Add Kuira to an Android project")
  - A wallet/sigil panel rendered in your UI (see "Set up Sigil identity")
agent_bundle: https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/theme-the-wallet-panel.md
---

# Theme the wallet & sigil panels

**Outcome:** the drop-in Kuira pills (`WalletStatusPanel`, `SigilStatusPanel`,
and the combined `PanelBar`) wear your app's brand — your **colours** via an
explicit palette and your **typeface** via the host's text context — while their
structure, layout, and behaviour stay exactly as the SDK ships them.

<div data-copy-prompt="https://raw.githubusercontent.com/kuiralabs/kuira-sdk-android/main/docs/recipes/theme-the-wallet-panel.md"
     data-task="Theme the Kuira wallet/sigil panels to match this app's brand — pass a custom WalletPanelColors/SigilPanelColors for colour, and provide a LocalTextStyle font family around PanelBar so the pills inherit the app's typeface. Keep the monospace DID/address fields as-is."></div>

---

## Two independent levers

The panels are themeable along two separate axes, and they work differently
**on purpose**:

| Lever | How you set it | Why it works this way |
|---|---|---|
| **Colour** | Explicit — pass a `WalletPanelColors` / `SigilPanelColors` to the panel. | Surfaces, borders, and text-on-surface need exact, predictable values; the SDK never guesses them from your theme. |
| **Typography** | Inherited — provide a `LocalTextStyle` around the panel. | The pills are ordinary Compose `Text`, so they ride the same text-style inheritance the rest of your UI does. |

You can use either lever alone or both together.

---

## Step 1 — Colour: pass a custom palette

Every panel takes a `colors` parameter. `WalletPanelColors` ships two presets —
`Default` (the dark "dusk" brand) and `Light`; `SigilPanelColors` ships `Default`
plus a `from(WalletPanelColors)` factory that derives a matching sigil palette
from your wallet one. You can also construct your own:

```kotlin title="app/src/main/.../ui/Brand.kt"
import androidx.compose.ui.graphics.Color
import com.midnight.kuira.dapp.sigil.SigilPanelColors
import com.midnight.kuira.dapp.wallet.WalletPanelColors

val MyWalletColors = WalletPanelColors.Default.copy(
    pillBackground = Color(0xFF15132B),
    pillBorder = Color(0x33FFFFFF),
    onPill = Color(0xFFEFE2C0),
    sheetBackground = Color(0xFF15132B),
    onSheet = Color(0xFFEFE2C0),
    // `error` is the financial-danger red pole; `accent` stays monochrome by
    // brand default — override only what your brand actually needs.
)

// Derive the matching sigil palette from the wallet one — keeps the two panels
// visually in lockstep. (Or hand-roll one with SigilPanelColors.Default.copy(…).)
val MySigilColors = SigilPanelColors.from(MyWalletColors)
```

Pass it wherever you render a panel:

```kotlin
// Either pill directly…
WalletStatusPanel(colors = MyWalletColors)
SigilStatusPanel(colors = MySigilColors)

// …or the combined bar (it forwards to both).
PanelBar(walletColors = MyWalletColors, sigilColors = MySigilColors)
```

**Verify:** launch the app — the pill background, border, and text now use your
palette, while the layout is unchanged.

---

## Step 2 — Typography: give the pills your typeface

The pills do **not** pin their own font family (the one exception is structural
monospace fields — the DID and on-chain addresses — which stay monospace by
design). That means they inherit `LocalTextStyle` from the composition that
surrounds them. Provide it once around the panel (or around your whole screen)
and the pills pick up your typeface:

```kotlin title="app/src/main/.../ui/MainScreen.kt"
import androidx.compose.material3.LocalTextStyle
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight

// A font you've bundled under app/src/main/res/font/ (any OFL/your-licensed face).
val Brand = FontFamily(
    Font(R.font.my_brand_regular, FontWeight.Normal),
    Font(R.font.my_brand_bold, FontWeight.Bold),
)

@Composable
fun MainScreen() {
    CompositionLocalProvider(
        LocalTextStyle provides LocalTextStyle.current.copy(fontFamily = Brand),
    ) {
        // Anything in here — including the Kuira pills — renders in `Brand`.
        PanelBar(/* … */)
        // …the rest of your screen…
    }
}
```

`androidx.compose.material3.ProvideTextStyle(myTextStyle) { … }` is the same
thing in shorthand if you prefer it.

!!! note "`MaterialTheme { }` alone is not enough"
    A `MaterialTheme` ancestor sets up your `Typography`, but a bare `Text`
    only adopts a typeface when a `LocalTextStyle` is actually provided around
    it (via `CompositionLocalProvider` / `ProvideTextStyle`, or a component
    like `Surface`/`Scaffold` that does so). Wrap the panel explicitly as
    above.

**Verify:** launch the app — the pill's labels and sheet text render in your
font; the truncated DID / addresses remain monospace.

---

## How it works

The colour lever is explicit because a financial surface should never infer its
own contrast from an ambient theme — you hand the panel exact values and it uses
them verbatim. The typography lever is inherited because the pills are built from
ordinary Material 3 `Text`, which reads `LocalTextStyle.current` and overrides
only the fields it sets (size, weight, colour) — never `fontFamily`. So your
app's text context flows straight through, exactly as it does for your own
`Text` calls. The DID and address fields opt out by pinning `FontFamily.Monospace`
themselves, so hashes stay legible regardless of your brand face.

This is intentional: the panel is **brand-neutral, not brand-locked**. It ships a
sensible default and gets out of your way when you theme around it.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Pill colours unchanged | `colors = …` not passed (the default palette is in use). | Pass your `WalletPanelColors` / `SigilPanelColors` to every panel, or to `PanelBar`. |
| Pill font unchanged | The `LocalTextStyle` provider doesn't enclose the panel, or you relied on `MaterialTheme` alone. | Wrap the panel in `CompositionLocalProvider(LocalTextStyle provides …)` / `ProvideTextStyle`. |
| DID/address didn't change font | Expected — those fields pin `FontFamily.Monospace` by design. | None; this keeps hashes readable across brands. |
| Your font leaks into other SDK surfaces you didn't intend | The provider scope is wider than you want. | Move the `CompositionLocalProvider` to wrap only the panel, not the whole screen. |

---

## What's next

- **[Reveal & restore the recovery phrase](reveal-and-restore-the-recovery-phrase.md)**
  — build a secure screen on top of the SDK's crypto.
- **[Back up wallet data across devices](back-up-wallet-across-devices.md)**
  — wire the Drive-backed delta restore.
