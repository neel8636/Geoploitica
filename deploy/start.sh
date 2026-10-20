#!/bin/sh
# Start the impact engine in the background, then the web app on the host's port.
set -e
cd /app/engine
PORT=8000 .venv/bin/python -m geopolitica_engine &
cd /repo/apps/web
exec npm run start -- -p "${PORT:-3000}"
