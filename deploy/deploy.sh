#!/usr/bin/env bash
# Build and publish the mobile UI to the nginx host.
# Usage: deploy/deploy.sh [ssh-host]   (default: the VPS from ~/.ssh/config)
set -euo pipefail

HOST="${1:-129.80.140.46}"
REMOTE_DIR=/var/www/dispatcharr-mobile/m
cd "$(dirname "$0")/.."

npm run build
tar -C dist -czf - . | ssh "$HOST" "
  set -e
  tmp=\$(mktemp -d)
  tar -C \"\$tmp\" -xzf -
  sudo mkdir -p $REMOTE_DIR
  # Replace atomically-ish: old hashed assets can stay briefly for open tabs
  sudo cp -r \"\$tmp\"/. $REMOTE_DIR/
  sudo find $REMOTE_DIR/assets -type f -mmin +60 -delete 2>/dev/null || true
  sudo chown -R root:root $REMOTE_DIR && sudo chmod -R a+rX $REMOTE_DIR
  rm -rf \"\$tmp\"
"
echo "Deployed to $HOST:$REMOTE_DIR"
