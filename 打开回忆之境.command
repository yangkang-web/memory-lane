#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd -- "$(dirname -- "$0")" || exit 1
if ! test -d node_modules; then npm ci || exit 1; fi
if ! test -f dist/index.html; then npm run build || exit 1; fi
node scripts/start.mjs || exit 1
open 'http://127.0.0.1:4327'
