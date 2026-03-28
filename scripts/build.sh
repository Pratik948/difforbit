#!/usr/bin/env bash
# =============================================================================
# DiffOrbit — build.sh
# Produces a production Tauri bundle (macOS .app + .dmg).
#
# Usage:
#   ./scripts/build.sh [--debug] [--no-sign]
#
# Environment variables (all optional):
#   APPLE_SIGNING_IDENTITY   e.g. "Developer ID Application: Foo Bar (TEAMID)"
#   APPLE_CERTIFICATE        Base64-encoded .p12 certificate
#   APPLE_CERTIFICATE_PASSWORD
#   APPLE_ID                 Apple ID for notarisation
#   APPLE_TEAM_ID
#   APPLE_ID_PASSWORD        App-Specific Password
# =============================================================================

set -euo pipefail

# Ensure Rust/Cargo is on PATH (rustup installs to ~/.cargo/bin)
[[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"
export PATH="$HOME/.cargo/bin:$PATH"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()     { echo -e "${GREEN}  ✓${NC} $*"; }
info()   { echo -e "${CYAN}  →${NC} $*"; }
warn()   { echo -e "${YELLOW}  ⚠${NC} $*"; }
fail()   { echo -e "${RED}  ✗${NC} $*"; exit 1; }
header() { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEBUG_FLAG=""
SIGN=true

for arg in "$@"; do
  case $arg in
    --debug)   DEBUG_FLAG="--debug"; warn "Building in DEBUG mode" ;;
    --no-sign) SIGN=false;           warn "Code signing disabled" ;;
  esac
done

header "DiffOrbit — Production Build"
echo "  Mode:     ${DEBUG_FLAG:-release}"
echo "  Signing:  $SIGN"
echo "  Platform: $(uname -s) $(uname -m)"
echo "  Time:     $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
header "Pre-flight"

[[ "$(uname)" == "Darwin" ]] || fail "Tauri macOS builds must run on macOS"

command -v rustc &>/dev/null  || fail "Rust not found — run scripts/setup.sh"
command -v node  &>/dev/null  || fail "Node not found — run scripts/setup.sh"
command -v npm   &>/dev/null  || fail "npm not found"

NODE_MAJOR=$(node --version | sed 's/v\([0-9]*\).*/\1/')
[[ "$NODE_MAJOR" -ge 20 ]] || fail "Node $NODE_MAJOR too old, need v20+"

ok "Rust $(rustc --version)"
ok "Node $(node --version)"

# ── Frontend ──────────────────────────────────────────────────────────────────
header "Frontend"

cd "$REPO_ROOT"

info "npm install (ci)..."
npm ci

info "TypeScript check..."
npx tsc --noEmit
ok "TypeScript: 0 errors"

# ── Code signing setup (macOS) ────────────────────────────────────────────────
if [[ "$SIGN" == true && -n "${APPLE_CERTIFICATE:-}" ]]; then
  header "Code signing"
  KEYCHAIN_PATH="$RUNNER_TEMP/difforbit-signing.keychain-db"
  KEYCHAIN_PASSWORD="$(openssl rand -hex 16)"

  info "Creating temporary keychain..."
  security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
  security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
  security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

  info "Importing certificate..."
  CERT_PATH=$(mktemp /tmp/difforbit-cert-XXXXXX.p12)
  echo "${APPLE_CERTIFICATE}" | base64 --decode > "$CERT_PATH"
  security import "$CERT_PATH" -P "${APPLE_CERTIFICATE_PASSWORD}" \
    -A -t cert -f pkcs12 -k "$KEYCHAIN_PATH"
  rm "$CERT_PATH"

  security list-keychain -d user -s "$KEYCHAIN_PATH"
  ok "Certificate imported to keychain"
fi

# ── Tauri build ───────────────────────────────────────────────────────────────
header "Tauri build"

BUILD_ARGS=("$DEBUG_FLAG")

# Pass signing identity if set
if [[ "$SIGN" == true && -n "${APPLE_SIGNING_IDENTITY:-}" ]]; then
  info "Signing with: $APPLE_SIGNING_IDENTITY"
fi

info "Running: npm run tauri build ${BUILD_ARGS[*]}"
npm run tauri build -- ${BUILD_ARGS[*]}

# ── Notarisation ──────────────────────────────────────────────────────────────
BUNDLE_DIR="$REPO_ROOT/src-tauri/target/${DEBUG_FLAG:+debug}${DEBUG_FLAG:-release}/bundle"
APP_PATH=$(find "$BUNDLE_DIR/macos" -name "*.app" 2>/dev/null | head -1 || true)
DMG_PATH=$(find "$BUNDLE_DIR/dmg"   -name "*.dmg" 2>/dev/null | head -1 || true)

if [[ -n "${APPLE_ID:-}" && -n "${APP_PATH:-}" && "$SIGN" == true ]]; then
  header "Notarisation"
  info "Submitting to Apple notarisation service..."
  xcrun notarytool submit "$DMG_PATH" \
    --apple-id "$APPLE_ID" \
    --team-id  "$APPLE_TEAM_ID" \
    --password "$APPLE_ID_PASSWORD" \
    --wait

  info "Stapling ticket..."
  xcrun stapler staple "$APP_PATH"
  xcrun stapler staple "$DMG_PATH"

  info "Verifying Gatekeeper..."
  spctl --assess --type exec "$APP_PATH" && ok "Gatekeeper: passed"
  ok "Notarisation complete"
else
  [[ -z "${APPLE_ID:-}" ]] && warn "APPLE_ID not set — skipping notarisation"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
header "Build complete!"
echo ""
[[ -n "${APP_PATH:-}" ]] && echo "  App:  $APP_PATH"
[[ -n "${DMG_PATH:-}" ]] && echo "  DMG:  $DMG_PATH"
echo ""

if [[ -n "${DMG_PATH:-}" ]]; then
  DMG_SIZE=$(du -sh "$DMG_PATH" | cut -f1)
  ok "DMG size: $DMG_SIZE"
fi
echo ""
