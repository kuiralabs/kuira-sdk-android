#!/usr/bin/env python3
"""Guard against a stale Dokka API reference.

The HTML under ``docs/api/`` is a pre-built Dokka drop, regenerated in the
SDK monorepo (kuira-android-wallet) and copied into this docs repo by hand.
Nothing in this repo's build regenerates it, so it silently drifts out of
sync with ``kuira_version`` in ``mkdocs.yml`` whenever a release bumps the
version but the API HTML isn't refreshed.

This check fails the build when that skew exists:

  * the expected ``kuira_version`` is missing from ``docs/api/``  → FAIL
  * ``docs/api/`` also carries a *different* release version      → FAIL
    (a partial / incomplete regeneration)
  * ``docs/api/`` is missing entirely                             → FAIL

Run it locally with ``python scripts/check-api-docs-version.py`` before
pushing, and in CI before ``mkdocs gh-deploy``.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MKDOCS_YML = REPO_ROOT / "mkdocs.yml"
API_DIR = REPO_ROOT / "docs" / "api"

# Kuira releases are tagged X.Y.Z-alphaN / -betaN / -rcN today; the final
# (suffix-less) form is matched separately via the literal expected string.
RELEASE_RE = re.compile(r"\b\d+\.\d+\.\d+-(?:alpha|beta|rc)\d+\b")
# Pull `kuira_version: "0.1.0-alpha04"` out of mkdocs.yml without a YAML
# parser — the file uses `!!python/name:` tags that trip safe_load.
KUIRA_VERSION_RE = re.compile(r'^\s*kuira_version:\s*["\']?([^"\'\s#]+)')


def expected_version() -> str:
    for line in MKDOCS_YML.read_text(encoding="utf-8").splitlines():
        m = KUIRA_VERSION_RE.match(line)
        if m:
            return m.group(1)
    fail(f"could not find `kuira_version:` in {MKDOCS_YML.relative_to(REPO_ROOT)}")


def versions_in_api() -> set[str]:
    """Every X.Y.Z-prerelease token stamped across the Dokka HTML."""
    found: set[str] = set()
    for path in API_DIR.rglob("*"):
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        found.update(RELEASE_RE.findall(text))
    return found


def fail(msg: str) -> None:
    print(f"\n✗ API docs version check FAILED\n  {msg}\n")
    print(
        "  Fix: regenerate the Dokka HTML from the alpha-matching SDK source\n"
        "  (kuira-android-wallet, dokka multi-module task), copy it into\n"
        "  docs/api/, then re-run this check.\n"
    )
    sys.exit(1)


def main() -> None:
    expected = expected_version()

    if not API_DIR.is_dir():
        fail(f"{API_DIR.relative_to(REPO_ROOT)}/ does not exist — no API reference to serve.")

    found = versions_in_api()
    expected_present = any(
        expected in path.read_text(encoding="utf-8", errors="ignore")
        for path in API_DIR.rglob("*")
        if path.is_file()
    )

    if not found and not expected_present:
        fail(
            f"no release-version stamp found anywhere in {API_DIR.relative_to(REPO_ROOT)}/ — "
            "is the Dokka output present and intact?"
        )

    if not expected_present:
        fail(
            f"mkdocs.yml declares kuira_version={expected!r}, but the API reference "
            f"never mentions it. Stale versions found: {sorted(found) or '(none)'}."
        )

    stale = found - {expected}
    if stale:
        fail(
            f"the API reference mixes versions — expected only {expected!r} but also "
            f"found {sorted(stale)}. Looks like a partial/incomplete Dokka refresh."
        )

    print(
        f"✓ API docs version check passed — docs/api/ matches "
        f"kuira_version={expected!r}."
    )


if __name__ == "__main__":
    main()
