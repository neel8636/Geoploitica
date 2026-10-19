# One image that runs the enterprise edition end to end: the Next.js web app on $PORT and
# the Python impact engine beside it on 8000, proxied through /api/engine. Built for hosts
# that give you a single container (Render, Fly, Railway); docker-compose.yml is the
# two-container version for local use.

FROM node:22-bookworm-slim AS web-build
ARG RENDER_GIT_COMMIT=unknown
ENV NEXT_PUBLIC_BUILD=$RENDER_GIT_COMMIT
WORKDIR /app
COPY apps/web/package*.json ./
RUN npm ci --no-audit --no-fund
COPY apps/web ./
# the Atlas is where reports are drafted; the enterprise edition publishes the same ones
COPY apps/atlas/src/content/dossiers ./src/content/dossiers/
RUN npm run build

FROM node:22-bookworm-slim
ARG RENDER_GIT_COMMIT=unknown
ENV NODE_ENV=production \
    NEXT_PUBLIC_BUILD=$RENDER_GIT_COMMIT \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENGINE_URL=http://127.0.0.1:8000
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-venv \
 && rm -rf /var/lib/apt/lists/*

# engine
WORKDIR /app/engine
COPY apps/engine/pyproject.toml apps/engine/README.md ./
COPY apps/engine/geoploitica_engine ./geoploitica_engine
RUN python3 -m venv .venv && .venv/bin/pip install --no-cache-dir --upgrade pip && .venv/bin/pip install --no-cache-dir .

# web
WORKDIR /app/web
COPY --from=web-build /app/.next ./.next
COPY --from=web-build /app/public ./public
COPY --from=web-build /app/src/content ./src/content
COPY --from=web-build /app/package*.json ./
COPY --from=web-build /app/node_modules ./node_modules

COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh
EXPOSE 3000
CMD ["/app/start.sh"]
