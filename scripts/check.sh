#!/usr/bin/env bash
# =============================================================================
# DiffOrbit — check.sh
# Runs all static analysis: TypeScript typecheck + Rust cargo check + ESLint.
#
# Usage:
#   ./scripts/check.sh [--ts-only] [--rust-only] [--no-lint]
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()     { echo -e "${GREEN}  ✓${NC} $*"; }
info()   { echo -e "${CYAN}  →${NC} $*"; }
warn()   { echo -e "${YELLOW}  ⚠${NC} $*"; }
fail()   { echo -e "${RED}  ✗${NC} $*"; }
header() { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

RUN_TS=true
RUN_RUST=true
RUN_LINT=true

for arg in "$@"; do
  case $arg in
    --ts-only)   RUN_RUST=false; RUN_LINT=false ;;
    --rust-only) RUN_TS=false;   RUN_LINT=false ;;
    --no-lint)   RUN_LINT=false ;;
  esac
done

ERRORS=0

cd "$REPO_ROOT"

# ── TypeScript ────────────────────────────────────────────────────────────────
if [[ "$RUN_TS" == true ]]; then
  header "TypeScript"
  info "Running tsc --noEmit..."
  if npx tsc --noEmit; then
    ok "TypeScript: 0 errors"
  else
    fail "TypeScript: type errors found"
    ((ERRORS++))
  fi
fi

# ── ESLint ────────────────────────────────────────────────────────────────────
if [[ "$RUN_LINT" == true ]]; then
  header "ESLint"
  if [[ -f "$REPO_ROOT/.eslintrc.cjs" || -f "$REPO_ROOT/eslint.config.js" || -f "$REPO_ROOT/eslint.config.mjs" ]]; then
    info "Running eslint src/..."
    if npx eslint src/ --max-warnings 0; then
      ok "ESLint: 0 warnings / errors"
    else
      fail "ESLint: issues found"
      ((ERRORS++))
    fi
  else
    warn "No ESLint config found — skipping lint"
  fi
fi

# ── Rust ──────────────────────────────────────────────────────────────────────
if [[ "$RUN_RUST" == true ]]; then
  header "Rust"

  # Source cargo env in case this shell doesn't have it
  source "$HOME/.cargo/env" 2>/dev/null || true

  if ! command -v cargo &>/dev/null; then
    warn "cargo not found — skipping Rust check (run scripts/setup.sh)"
  else
    info "Running cargo check..."
    if (cd "$REPO_ROOT/src-tauri" && cargo check 2>&1); then
      ok "cargo check: clean"
    else
      fail "cargo check: errors found"
      ((ERRORS++))
    fi

    info "Running cargo clippy..."
    if (cd "$REPO_ROOT/src-tauri" && cargo clippy -- -D warnings 2>&1); then
      ok "cargo clippy: 0 warnings"
    else
      warn "cargo clippy: warnings found (non-fatal)"
    fi
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────
header "Summary"
if [[ $ERRORS -eq 0 ]]; then
  ok "All checks passed"
  exit 0
else
  fail "$ERRORS check(s) failed"
  exit 1
fi
