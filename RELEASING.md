# Releasing the Kuira SDK docs

How to publish the docs site for a new SDK version. One script (`scripts/release-docs.sh`) does most of the mechanical work; this checklist adds the steps it does not automate (changelog, roadmap, and the Compact toolchain triple) plus verification and shipping.

## When to run

Only **after** the SDK version is tagged and published to Maven Central. The docs track the latest **published** release, not `HEAD`. Do not regenerate Dokka for an in-development version (for example, `version=0.1.0-alpha05` in `gradle.properties` with no `v0.1.0-alpha05` tag): you would be documenting a moving API.

## The fast path

```bash
scripts/release-docs.sh <version>          # e.g. 0.1.0-alpha05
scripts/release-docs.sh <version> --skip-dokka   # if docs/api is already at <version>
```

That one command bumps `kuira_version` and `kuira_contract_plugin_version` in `mkdocs.yml` (and the README install coordinate), regenerates Dokka in the monorepo (`./gradlew dokkaHtmlMultiModule`), rsyncs it into `docs/api/`, and then runs the version guard. It does **not** touch the changelog, the roadmap, or the Compact toolchain triple.

## Full checklist

### 1. Preconditions
- [ ] SDK `<version>` is tagged (`v<version>`) and published to Maven Central (`io.github.kuiralabs:*`).
- [ ] The monorepo (kuira-android-wallet) is checked out at that tag; Dokka is generated from it.
- [ ] You know the Compact toolchain versions if any changed (`compactc --version`, `--language-version`, `--runtime-version`).

### 2. Bump pins + regenerate Dokka (the script)
- [ ] Run `scripts/release-docs.sh <version>` from the docs repo.
- [ ] It bumped the two `mkdocs.yml` pins, refreshed `docs/api/`, and passed `check-api-docs-version.py`.

### 3. Compact toolchain triple (manual: the script only reminds)
- [ ] If compactc / language / runtime changed, update `compactc_version`, `compact_language_version`, `compact_runtime_version` in `mkdocs.yml`. These move on their own cadence, independent of the SDK alpha.

### 4. Changelog
- [ ] In `CHANGELOG.md` (monorepo root), rename the `[Unreleased]` section to `[<version>] — <date>` and open a fresh `[Unreleased]`.
- [ ] Mirror the same change into `docs/changelog.md` (the public page). Keep the two in sync.

### 5. Version-dependent narrative docs (manual)
- [ ] `docs/roadmap.md`: move newly-shipped items from In progress / Planned to Shipped; add anything new to Planned.
- [ ] `docs/migrating.md`: add a new `<old> → <new>` section with the upgrade prompt (breaking changes + recommended adoptions). Prior sections stay as history; use literal versions, not the macro.
- [ ] `docs/capabilities.md` and any recipe whose behavior changed with the release.
- [ ] Sweep for stale hard-coded versions: `grep -rnE "0\.1\.0-alpha0[0-9]" docs/ | grep -v docs/api/`. The `{{ kuira_version }}` macro covers everything that uses it; this catches the ones that don't.

### 6. Build + preview locally
- [ ] `mkdocs build --strict` (the macros plugin's `on_error_fail` catches broken substitutions and typos), or `mkdocs serve` to eyeball.
- [ ] `python scripts/check-api-docs-version.py` passes (same guard CI runs).
- [ ] Spot-check: the API reference page loads the new Dokka, install snippets show `<version>`, favicon and nav look right.

### 7. Ship
- [ ] Commit and push to `main`.
- [ ] The `docs.yml` workflow runs the version guard, then `mkdocs gh-deploy --force --clean` to `gh-pages` automatically. Confirm the Actions run is green.

### 8. Post-deploy verification
- [ ] Live site (`kuiralabs.github.io/kuira-sdk-android`) shows `<version>` in install snippets.
- [ ] `/api/` (Dokka) shows `<version>`.
- [ ] The changelog reflects the release.

## Gotchas
- `docs/api/` is a hand-copied Dokka drop; nothing in the docs build regenerates it. Step 2 (or the script) is mandatory on every version bump, otherwise the site ships stale API docs.
- The guard (`check-api-docs-version.py`) fails the build if `docs/api/`'s embedded version differs from `kuira_version`, or if `docs/api/` carries mixed versions (a partial regen). It runs in CI before deploy, so a skewed release cannot ship silently.
- Docs track the latest release, not `HEAD`. Wait for the tag.
