#!/bin/sh
set -e

echo "==> Running prisma migrate deploy..."
npx prisma migrate deploy
echo "==> Migrations applied successfully"

echo "==> Starting Next.js server..."
exec node server.js
