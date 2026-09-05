# syntax=docker/dockerfile:1
# Next.js 16 standalone - untuk EasyPanel (Build Method: Dockerfile, Port 3000)
# Cache bust: 2026-09-05 prisma CLI stage terpisah + symlink (fix edgesOut/NODE_PATH)

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://build:***@localhost:5432/build"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# Stage khusus CLI prisma. Dipasang di direktori bersih supaya npm tidak
# menabrak node_modules bawaan output standalone Next.js — install di /app bikin
# npm arborist crash "Cannot read properties of null (reading 'edgesOut')".
FROM node:22-alpine AS prisma-cli
WORKDIR /opt/prisma-cli
RUN npm init -y > /dev/null \
 && npm install --omit=dev --no-audit --no-fund prisma@7.10.0

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma: schema + config + migrations + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

# CLI prisma + psql untuk seed.
# Di-symlink ke /app/node_modules/prisma supaya `import { defineConfig } from "prisma/config"`
# di prisma.config.ts ter-resolve lewat lookup node_modules biasa — NODE_PATH tidak
# berlaku untuk ESM, itu sebab varian `npm install -g` sebelumnya gagal.
# Dependensi internal CLI tetap resolve dari realpath-nya di /opt/prisma-cli.
COPY --from=prisma-cli /opt/prisma-cli /opt/prisma-cli
RUN apk add --no-cache postgresql-client \
 && mkdir -p /app/node_modules \
 && rm -rf /app/node_modules/prisma \
 && ln -s /opt/prisma-cli/node_modules/prisma /app/node_modules/prisma \
 && ln -s /opt/prisma-cli/node_modules/.bin/prisma /usr/local/bin/prisma \
 && (cd /tmp && prisma --version)

# Entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["./docker-entrypoint.sh"]
