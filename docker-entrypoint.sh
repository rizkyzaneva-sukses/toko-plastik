#!/bin/sh
set -e

echo "==> Running prisma migrate deploy..."
npx prisma migrate deploy
echo "==> Migrations applied successfully"

echo "==> Running seed (idempotent)..."
psql "$DATABASE_URL" -f prisma/seed.sql || echo "==> Seed skipped/failed (non-fatal)"

echo "==> Starting Next.js server..."
exec node server.js
