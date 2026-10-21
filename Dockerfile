# One image that runs the enterprise edition end to end: the Next.js web app on $PORT and
# the Python impact engine beside it on 8000, proxied through /api/engine. Built for hosts
# that give you a single container (Render, Fly, Railway); docker-compose.yml is the
# two-container version for local use.

FROM node:22-bookworm-slim AS web-build
ARG RENDER_GIT_COMMIT=unknown
ENV NEXT_PUBLIC_BUILD=$RENDER_GIT_COMMIT
# The monorepo layout is kept (apps/web beside apps/atlas) because the enterprise edition
# imports the Atlas event graph and reports by relative path.
WORKDIR /repo/apps/web
# Reader accounts (Firebase). These are the public web-app settings, the same ones the Atlas
# ships in its pages; Render can override any of them with an environment variable.
ARG NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA_bnPFuNY131FtUrpsEgkonFPyKwMnuzs
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=geopolitica-941b0.firebaseapp.com
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=geopolitica-941b0
ARG NEXT_PUBLIC_FIREBASE_APP_ID=1:600266158045:web:1a40696fc81a511add1034
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=geopolitica-941b0.firebasestorage.app
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=600266158045
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-HNQBF1FW1B
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
COPY apps/web/package*.json ./
RUN npm ci --no-audit --no-fund
COPY apps/web ./
COPY apps/atlas/src/content /repo/apps/atlas/src/content
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
COPY apps/engine/geopolitica_engine ./geopolitica_engine
RUN python3 -m venv .venv && .venv/bin/pip install --no-cache-dir --upgrade pip && .venv/bin/pip install --no-cache-dir .

# web
WORKDIR /repo/apps/web
COPY --from=web-build /repo/apps/web/.next ./.next
COPY --from=web-build /repo/apps/web/public ./public
COPY --from=web-build /repo/apps/web/src/content ./src/content
COPY --from=web-build /repo/apps/web/package*.json ./
COPY --from=web-build /repo/apps/web/node_modules ./node_modules
COPY --from=web-build /repo/apps/atlas/src/content /repo/apps/atlas/src/content

COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh
EXPOSE 3000
CMD ["/app/start.sh"]
