#!/usr/bin/env bash
# =============================================================================
# DiffOrbit — dev.sh
# Starts the full Tauri dev environment with hot-reload.
# Automatically ensures MatrixUI is built before launching.
#
# Usage:
#   ./scripts/dev.sh [--frontend-only]
# =============================================================================

set -euo pipefail

# Ensure Rust/Cargo is on PATH (rustup installs to ~/.cargo/bin)
# This is needed when the script is launched from npm or a GUI terminal
# that hasn't sourced ~/.cargo/env
[[ -f "$HOME/.cargo/env" ]] && source "$HOME/.cargo/env"
export PATH="$HOME/.cargo/bin:$PATH"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
info() { echo -e "${CYAN}  →${NC} $*"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $*"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MATRIXUI_DIR="$(cd "$REPO_ROOT/.." && pwd)/matrix-ui"
FRONTEND_ONLY=false

for arg in "$@"; do
  [[ "$arg" == "--frontend-only" ]] && FRONTEND_ONLY=true
done

echo -e "${CYAN}"
echo "  ██████╗ ██╗███████╗███████╗ ██████╗ ██████╗ ██████╗ ██╗████████╗"
echo "  ██╔══██╗██║██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗██║╚══██╔══╝"
echo "  ██║  ██║██║█████╗  █████╗  ██║   ██║██████╔╝██████╔╝██║   ██║"
echo "  ██║  ██║██║██╔══╝  ██╔══╝  ██║   ██║██╔══██╗██╔══██╗██║   ██║"
echo "  ██████╔╝██║██║     ██║     ╚██████╔╝██║  ██║██████╔╝██║   ██║"
echo "  ╚═════╝ ╚═╝╚═╝     ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚═╝   ╚═╝"
echo "${NC}"
echo "  Mode: $([ "$FRONTEND_ONLY" == true ] && echo 'Frontend only (Vite)' || echo 'Full Tauri dev')"
echo ""

# ── Check MatrixUI ────────────────────────────────────────────────────────────
if [[ ! -f "$MATRIXUI_DIR/packages/tokens/dist/index.js" ]]; then
  warn "MatrixUI not built yet — building..."
  if [[ ! -d "$MATRIXUI_DIR" ]]; then
    info "Cloning MatrixUI..."
    git clone https://github.com/Pratik948/matrix-ui.git "$MATRIXUI_DIR"
  fi
  (cd "$MATRIXUI_DIR" && pnpm install && pnpm build)
  ok "MatrixUI ready"
else
  ok "MatrixUI already built"
fi

# ── Check node_modules ────────────────────────────────────────────────────────
if [[ ! -d "$REPO_ROOT/node_modules/@matrixui" ]]; then
  info "Installing frontend deps..."
  (cd "$REPO_ROOT" && npm install)
fi
ok "node_modules ready"

cd "$REPO_ROOT"

# ── Launch ────────────────────────────────────────────────────────────────────
if [[ "$FRONTEND_ONLY" == true ]]; then
  info "Starting Vite dev server only (http://localhost:1420)..."
  info "Note: Tauri IPC calls will fail in browser — use full mode for IPC testing"
  npm run dev
else
  info "Starting Tauri dev (opens native window with hot-reload)..."
  info "Rust recompiles on save · Vite HMR for frontend · Press Ctrl+C to quit"
  echo ""
  npm run tauri dev
fi
