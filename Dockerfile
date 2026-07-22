# Root Dockerfile for the `app` service in docker-compose.yml.
# Compose builds with `context: .` (repo root) and `dockerfile: Dockerfile`, so paths
# here are relative to the repo root — that's why the frontend is copied from `frontend/`.
# It produces the standalone Next.js server (the user-facing app on :3000).
FROM node:20-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# ---- deps: install from the lockfile only, for a cacheable layer ----
FROM base AS deps
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# ---- builder: compile the standalone production bundle ----
FROM base AS builder
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so the API URL
# the browser calls must be supplied here (not just at runtime). Override per environment:
#   docker compose build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./
RUN npm run build

# ---- runner: minimal image with only the standalone output ----
FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "server.js"]
