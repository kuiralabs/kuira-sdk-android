#!/usr/bin/env bash
#
# Release the Kuira docs at a new SDK version — in one command.
#
# The docs site is already single-sourced: every install snippet in docs/
# uses `{{ kuira_version }}`, which the mkdocs-macros plugin expands from
# ONE line in mkdocs.yml. The only things NOT auto-driven by that line:
#
#   1. mkdocs.yml `kuira_version` + `kuira_contract_plugin_version` (the source)
#   2. README.md install coordinate (GitHub renders README raw — no {{ }})
#   3. docs/api/  — the Dokka HTML, which has the version baked in 2882×
#                   and can ONLY be fixed by REGENERATING, not find/replace.
#                   (#3 is what left stale alpha03 docs last time.)
#
# This script handles all three, then PROVES nothing stale survives. It does
# NOT touch frozen history ("fixed in alpha04", "x86_64 on alpha04+") or the
# independent Compact/node versions — those are deliberately version-pinned.
#
# Usage:
#   scripts/release-docs.sh <version>            e.g. 0.1.0-alpha05
#   scripts/release-docs.sh <version> --skip-dokka   (docs/api already at <version>)
#
# Env:
#   KUIRA_MONOREPO   path to the SDK monorepo (default below)
#   JAVA_HOME        JDK for the Dokka build (default: homebrew openjdk@17)
#
# Leaves everything STAGED, not committed — review, then commit + push.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

NEW="${1:-}"
SKIP_DOKKA=0
[ "${2:-}" = "--skip-dokka" ] && SKIP_DOKKA=1
MONOREPO="${KUIRA_MONOREPO:-/Users/norman/Development/android/projects/kuira-android-wallet}"

die() { printf '\n✗ %s\n' "$*" >&2; exit 1; }

[ -n "$NEW" ] || die "usage: scripts/release-docs.sh <version> [--skip-dokka]   e.g. 0.1.0-alpha05"
echo "$NEW" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-z]+[0-9]+)?$' \
  || die "version '$NEW' is not X.Y.Z or X.Y.Z-alphaN"

OLD="$(grep -E '^[[:space:]]*kuira_version:' mkdocs.yml | sed -E 's/.*"([^"]+)".*/\1/')"
[ -n "$OLD" ] || die "couldn't read kuira_version from mkdocs.yml"

echo "── Kuira docs release: ${OLD} → ${NEW} ──"

# ── 1. The source of truth must agree: the monorepo has to BE at $NEW, ──
#       so the Dokka it generates stamps $NEW. Refusing here is exactly
#       what would have prevented the stale-API-docs problem last time.
if [ "$SKIP_DOKKA" -eq 0 ]; then
  [ -d "$MONOREPO" ] || die "monorepo not found at $MONOREPO — set KUIRA_MONOREPO"
  MONO_VER="$(grep -E '^version=' "$MONOREPO/gradle.properties" | sed -E 's/version=//')"
  [ "$MONO_VER" = "$NEW" ] || die "monorepo gradle.properties version=$MONO_VER, but releasing docs at $NEW.
   Bump the monorepo + publish the artifacts at $NEW first, then re-run.
   (Generating Dokka from a mismatched source is what left stale API docs before.)"
fi

# ── 2. Bump the current-version literals — TARGETED, never global, so ──
#       frozen history and independent versions are untouched.
perl -i -pe "s/(^[[:space:]]*kuira_version:[[:space:]]*\").*?(\")/\${1}${NEW}\${2}/"                 mkdocs.yml
perl -i -pe "s/(^[[:space:]]*kuira_contract_plugin_version:[[:space:]]*\").*?(\")/\${1}${NEW}\${2}/" mkdocs.yml
perl -i -pe "s/(io\.github\.kuiralabs:[a-z-]+:)[0-9]+\.[0-9]+\.[0-9]+(-[a-z]+[0-9]+)?/\${1}${NEW}/g"  README.md
echo "  ✓ bumped mkdocs.yml pins + README install coordinate"

# ── 3. Regenerate the Dokka API reference (find/replace cannot do this) ──
if [ "$SKIP_DOKKA" -eq 0 ]; then
  echo "  → regenerating Dokka from ${MONOREPO} (a couple of minutes)…"
  : "${JAVA_HOME:=/opt/homebrew/opt/openjdk@17}"
  export JAVA_HOME
  rm -rf "$MONOREPO/build/dokka/htmlMultiModule"
  ( cd "$MONOREPO" && ./gradlew dokkaHtmlMultiModule --console=plain -q )
  [ -f "$MONOREPO/build/dokka/htmlMultiModule/index.html" ] || die "Dokka output missing — build failed"
  rsync -a --delete "$MONOREPO/build/dokka/htmlMultiModule/" docs/api/
  echo "  ✓ docs/api/ regenerated"
else
  echo "  ⏭  --skip-dokka: not regenerating docs/api (must already be at ${NEW})"
fi

# ── 4. PROVE nothing stale survives ───────────────────────────────────
# 4a. docs/api stamps exactly $NEW (reuses the CI guard).
python3 scripts/check-api-docs-version.py >/dev/null \
  || die "API-version guard failed — docs/api does not match ${NEW}"

# 4b. No install coordinate anywhere (the lines devs copy) may carry a
#     version other than $NEW. {{ kuira_version }} coords are excluded
#     (their version isn't a digit), so this catches any literal drift.
ESC_NEW="$(printf '%s' "$NEW" | sed 's/[.]/\\./g')"
BAD="$(grep -rnE "io\.github\.kuiralabs:[a-z-]+:[0-9]" docs README.md 2>/dev/null \
        | grep -vE "docs/api/" | grep -vE ":${ESC_NEW}([^0-9.]|$)" || true)"
[ -z "$BAD" ] || die "stale install coordinate(s) not at ${NEW}:
${BAD}"

# 4c. mkdocs pins are $NEW.
grep -qE "^[[:space:]]*kuira_version:[[:space:]]*\"${ESC_NEW}\"" mkdocs.yml || die "kuira_version did not update"
grep -qE "^[[:space:]]*kuira_contract_plugin_version:[[:space:]]*\"${ESC_NEW}\"" mkdocs.yml || die "plugin version did not update"
echo "  ✓ verified: docs/api, mkdocs pins, and every install coordinate are at ${NEW}"

# ── 5. Surface what was deliberately LEFT alone, for a human eyeball ───
echo
echo "── Frozen version mentions left untouched (confirm these are intentional history) ──"
grep -rnE "[0-9]+\.[0-9]+\.[0-9]+-alpha[0-9]+|alpha0[0-9]" docs README.md 2>/dev/null \
  | grep -vE "docs/api/" \
  | grep -vE "kuira_version|kuira_contract_plugin_version" \
  | grep -vE ":${ESC_NEW}([^0-9.]|$)" \
  | grep -vE "${ESC_NEW}" \
  | sed 's/^/   /' || true
[ "${PIPESTATUS[0]:-0}" ] # keep set -e happy
echo
echo "── Independent versions (separate cadence — NOT bumped with the SDK) ──"
grep -nE "compactc_version|compact_language_version|compact_runtime_version" mkdocs.yml | sed 's/^/   /'

echo
echo "✓ Docs released at ${NEW} — staged, not committed."
echo "  Review : git -C \"$REPO_ROOT\" status --short | grep -v ' docs/api/'"
echo "  Ship   : git add -A && git commit -m \"docs: release ${NEW}\" && git push origin main"
