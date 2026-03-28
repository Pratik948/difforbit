#!/usr/bin/env bash
# =============================================================================
# DiffOrbit — setup.sh
# Installs every tool and dependency required to develop and build the app.
# Safe to re-run: each step is idempotent.
#
# Usage:
#   chmod +x scripts/setup.sh && ./scripts/setup.sh
#
# Supported platforms: macOS 13+ (primary target), Ubuntu 22.04+ (CI)
# =============================================================================

set -euo pipefail

# ── Colours ─────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
info() { echo -e "${CYAN}  →${NC} $*"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $*"; }
fail() { echo -e "${RED}  ✗${NC} $*"; exit 1; }
header() { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MATRIXUI_DIR="$(cd "$REPO_ROOT/.." && pwd)/matrix-ui"

header "DiffOrbit — Setup"
echo "  Repo:     $REPO_ROOT"
echo "  MatrixUI: $MATRIXUI_DIR"
echo "  OS:       $(uname -s) $(uname -m)"

# ── 1. System packages (macOS) ───────────────────────────────────────────────
header "1. System dependencies"

if [[ "$(uname)" == "Darwin" ]]; then
  if ! command -v brew &>/dev/null; then
    info "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  else
    ok "Homebrew already installed"
  fi

  BREW_PKGS=(pkg-config openssl@3 cmake)
  for pkg in "${BREW_PKGS[@]}"; do
    if brew list "$pkg" &>/dev/null 2>&1; then
      ok "$pkg already installed"
    else
      info "brew install $pkg"
      brew install "$pkg"
    fi
  done

elif [[ "$(uname)" == "Linux" ]]; then
  info "Installing Linux GTK/WebKit build dependencies..."
  sudo apt-get update -qq
  sudo apt-get install -y --no-install-recommends \
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libssl-dev \
    pkg-config \
    build-essential \
    curl \
    wget \
    file
  ok "Linux system packages installed"
fi

# ── 2. Rust ──────────────────────────────────────────────────────────────────
header "2. Rust toolchain"

if ! command -v rustc &>/dev/null; then
  info "Installing Rust via rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
else
  ok "Rust $(rustc --version) already installed"
fi

# Ensure cargo is on PATH
source "$HOME/.cargo/env" 2>/dev/null || true

# Update to latest stable
info "Updating Rust to stable..."
rustup update stable --no-self-update

ok "Rust: $(rustc --version)"
ok "Cargo: $(cargo --version)"

# ── 3. Node.js ───────────────────────────────────────────────────────────────
header "3. Node.js"

REQUIRED_NODE_MAJOR=20
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node --version | sed 's/v\([0-9]*\).*/\1/')
  if [[ "$NODE_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ]]; then
    ok "Node $(node --version) already installed"
  else
    warn "Node $(node --version) is too old (need v${REQUIRED_NODE_MAJOR}+). Please upgrade."
    if command -v fnm &>/dev/null; then
      info "Using fnm to install Node $REQUIRED_NODE_MAJOR..."
      fnm install $REQUIRED_NODE_MAJOR && fnm use $REQUIRED_NODE_MAJOR
    elif [[ "$(uname)" == "Darwin" ]]; then
      info "brew install node@$REQUIRED_NODE_MAJOR"
      brew install "node@$REQUIRED_NODE_MAJOR"
    fi
  fi
else
  if [[ "$(uname)" == "Darwin" ]]; then
    info "brew install node"
    brew install node
  else
    info "Installing Node.js $REQUIRED_NODE_MAJOR via NodeSource..."
    curl -fsSL "https://deb.nodesource.com/setup_${REQUIRED_NODE_MAJOR}.x" | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
fi

ok "Node: $(node --version)"
ok "npm:  $(npm --version)"

# ── 4. pnpm ──────────────────────────────────────────────────────────────────
header "4. pnpm (required for MatrixUI monorepo)"

if ! command -v pnpm &>/dev/null; then
  info "Installing pnpm..."
  npm install -g pnpm
else
  ok "pnpm $(pnpm --version) already installed"
fi

# ── 5. GitHub CLI ────────────────────────────────────────────────────────────
header "5. GitHub CLI (gh)"

if ! command -v gh &>/dev/null; then
  if [[ "$(uname)" == "Darwin" ]]; then
    info "brew install gh"
    brew install gh
  else
    info "Installing gh on Linux..."
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list
    sudo apt-get update -qq && sudo apt-get install -y gh
  fi
else
  ok "gh $(gh --version | head -1) already installed"
fi

if gh auth status &>/dev/null 2>&1; then
  ok "gh already authenticated"
else
  warn "gh not authenticated — run: gh auth login"
fi

# ── 6. Claude Code CLI (optional) ────────────────────────────────────────────
header "6. Claude Code CLI (optional — needed for claude_code engine)"

if ! command -v claude &>/dev/null; then
  info "Installing @anthropic-ai/claude-code..."
  npm install -g @anthropic-ai/claude-code
else
  ok "claude already installed"
fi

# ── 7. Clone and build MatrixUI ──────────────────────────────────────────────
header "7. MatrixUI peer dependency"

if [[ -d "$MATRIXUI_DIR" ]]; then
  ok "MatrixUI repo already exists at $MATRIXUI_DIR"
  info "Pulling latest..."
  git -C "$MATRIXUI_DIR" pull --ff-only 2>/dev/null || warn "Could not pull (local changes?)"
else
  info "Cloning MatrixUI to $MATRIXUI_DIR..."
  git clone https://github.com/Pratik948/matrix-ui.git "$MATRIXUI_DIR"
fi

info "Installing MatrixUI dependencies..."
(cd "$MATRIXUI_DIR" && pnpm install --frozen-lockfile 2>/dev/null || pnpm install)

info "Building MatrixUI packages..."
(cd "$MATRIXUI_DIR" && pnpm build)

ok "MatrixUI built — @matrixui/tokens and @matrixui/react ready"

# ── 8. Frontend npm install ───────────────────────────────────────────────────
header "8. DiffOrbit frontend dependencies"

cd "$REPO_ROOT"
info "npm install..."
npm install

ok "node_modules ready"

# ── 9. Rust crates (pre-fetch) ────────────────────────────────────────────────
header "9. Pre-fetch Rust crates"

cd "$REPO_ROOT/src-tauri"
info "cargo fetch..."
cargo fetch
ok "Rust crates cached"

# ── Done ──────────────────────────────────────────────────────────────────────
header "Setup complete!"
echo ""
echo "  Next steps:"
echo "    npm run dev          # start Vite dev server only"
echo "    npm run tauri:dev    # start full Tauri app (hot-reload)"
echo "    npm run check        # typecheck + cargo check"
echo "    npm run build:app    # production build"
echo ""
if ! gh auth status &>/dev/null 2>&1; then
  echo -e "  ${YELLOW}⚠  Run 'gh auth login' to authenticate with GitHub${NC}"
fi
echo ""
