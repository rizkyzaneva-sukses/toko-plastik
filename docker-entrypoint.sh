#!/bin/sh
set -e

echo "==> Running prisma migrate deploy..."
node node_modules/prisma/build/index.js migrate deploy
echo "==> Migrations applied successfully"

echo "==> Starting Next.js server..."
exec node server.js
