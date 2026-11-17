#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
node seed.mjs
echo 'Open http://localhost:3000 in your browser. Ctrl+C stops the server.'
exec node server.mjs
