#!/bin/sh
set -e

echo "==> Running prisma migrate deploy..."
npx prisma migrate deploy
echo "==> Migrations applied successfully"

echo "==> Running seed (idempotent)..."
npx tsx prisma/seed.ts || echo "==> Seed skipped/failed (non-fatal)"

echo "==> Starting Next.js server..."
exec node server.js
