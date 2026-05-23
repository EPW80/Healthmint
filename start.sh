#!/usr/bin/env bash
# start.sh — launch Healthmint (server + client) in development mode
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── preflight checks ──────────────────────────────────────────────────────────

if ! command -v node &>/dev/null; then
  echo "ERROR: node is not installed or not on PATH" >&2
  exit 1
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ERROR: Node.js >=18 required (found $(node -v))" >&2
  exit 1
fi

if [ ! -f "$ROOT/server/.env" ]; then
  echo "ERROR: server/.env not found — copy server/.env.example and fill in values" >&2
  exit 1
fi

# ── dependency check / install ────────────────────────────────────────────────

install_if_needed() {
  local dir="$1"
  if [ ! -d "$dir/node_modules" ]; then
    echo "→ Installing dependencies in $dir ..."
    npm install --prefix "$dir"
  fi
}

install_if_needed "$ROOT"
install_if_needed "$ROOT/server"
install_if_needed "$ROOT/client"

# ── contract compilation ──────────────────────────────────────────────────────

if [ ! -f "$ROOT/client/src/contracts/HealthDataMarketplace.json" ]; then
  echo "→ Contract artifacts missing — compiling with Truffle..."
  npx --prefix "$ROOT" truffle compile --config truffle-config.cjs
fi

# ── launch ────────────────────────────────────────────────────────────────────

echo ""
echo "Starting Healthmint..."
echo "  Server → http://localhost:5000"
echo "  Client → http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both processes."
echo ""

# concurrently is a root dev dependency — run through the local bin
"$ROOT/node_modules/.bin/concurrently" \
  --kill-others-on-fail \
  --prefix "[{name}]" \
  --names "server,client" \
  --prefix-colors "cyan,green" \
  "cd '$ROOT/server' && node --experimental-specifier-resolution=node server.js" \
  "cd '$ROOT/client' && npm start"
