"""CI guard: every bulk-insert call site must stamp organization_id.

``bulk_save_objects`` / ``bulk_insert_mappings`` bypass the before_flush tenant-stamp
event, so a bulk insert that forgets ``organization_id`` would silently create rows
with no tenant. This static check fails the build if any such call site lacks an
``organization_id`` reference in its immediate vicinity.

Run: python -m scripts.check_tenant_stamps   (exit 0 = clean, 1 = violation)
"""

import pathlib
import re
import sys

BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[1]
BULK_CALL = re.compile(r"\.(bulk_save_objects|bulk_insert_mappings)\s*\(")
# Skip generated/vendored/test trees (and this script itself, which names the pattern).
SKIP_DIRS = {"tests", "alembic", "venv", "__pycache__", "scripts", ".git"}
CONTEXT_WINDOW = 6


def main() -> int:
    violations = []
    for path in BACKEND_ROOT.rglob("*.py"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        lines = path.read_text(encoding="utf-8").splitlines()
        for i, line in enumerate(lines):
            if not BULK_CALL.search(line):
                continue
            lo = max(0, i - CONTEXT_WINDOW)
            hi = min(len(lines), i + CONTEXT_WINDOW + 1)
            if "organization_id" not in "\n".join(lines[lo:hi]):
                rel = path.relative_to(BACKEND_ROOT)
                violations.append(f"  {rel}:{i + 1}: bulk insert without a nearby organization_id stamp")

    if violations:
        print("Tenant-stamp guard FAILED — bulk inserts must set organization_id:")
        print("\n".join(violations))
        return 1

    print("Tenant-stamp guard OK: all bulk inserts stamp organization_id.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
