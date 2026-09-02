import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma CLI 7 tidak lagi memuat .env sendiri. Next.js tetap memuatnya saat
// runtime, jadi ini hanya untuk perintah CLI (migrate, seed, studio).
// Di produksi env sudah diinjeksi EasyPanel, jadi ketiadaan .env bukan error.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // .env tidak ada — pakai env dari shell/container.
}

// Prisma 7 memindahkan URL datasource dari schema.prisma ke file ini,
// supaya kredensial tidak pernah ikut ter-commit di schema.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
