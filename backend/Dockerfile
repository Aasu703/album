# NestJS API image. Built by the `backend` service in docker-compose.yml with
# `context: ./backend`. Multi-stage: compile with dev deps + native toolchain,
# then ship a lean runtime with production deps only.
FROM node:20-bookworm-slim AS base
WORKDIR /app

# ---- deps: install everything (incl. dev) so the build can run ----
# bcrypt is a native addon; python3/make/g++ let npm compile it when no prebuilt
# binary matches this platform.
FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: compile TypeScript to dist/ ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner: production deps + compiled output only ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nestjs

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Drop dev dependencies from the copied modules (keeps the compiled bcrypt binary).
RUN npm prune --omit=dev && chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "dist/main"]
