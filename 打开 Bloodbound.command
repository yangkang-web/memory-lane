#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if [[ ! -f dist-bloodbound/bloodbound.html ]]; then
  npm run build:bloodbound || exit 1
fi
node scripts/bloodbound-server.mjs --start || exit 1
open http://127.0.0.1:4330
