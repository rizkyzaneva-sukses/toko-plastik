/**
 * Seed — idempoten, aman dijalankan berkali-kali.
 *
 * PRD pasal 14 langkah 1: "Skema Prisma + migrasi + seed owner/kasir/UMUM."
 *
 * Seed ini SENGAJA tidak mengisi stok apa pun. PRD pasal 12: "Go-live tanpa
 * stok awal = stok palsu." Stok awal dimasukkan lewat menu Stok > Stok Awal
 * berdasarkan hasil opname fisik hari go-live, bukan lewat data contoh.
 */

import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Prisma CLI 7 tidak lagi memuat .env sendiri, dan seed ini juga dijalankan
// langsung lewat `npm run db:seed` (tsx, tanpa Prisma CLI). Tanpa baris ini
// seed gagal di komputer lokal dengan pesan "DATABASE_URL belum diisi".
// Di produksi env sudah diinjeksi EasyPanel, jadi ketiadaan .env bukan error.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // tidak ada .env — pakai env dari shell/container
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL belum diisi. Salin .env.example menjadi .env, atau jalankan " +
      "perintah ini dengan DATABASE_URL sudah ada di environment."
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const passwordOwner = process.env.SEED_OWNER_PASSWORD || "admin123";
  const passwordKasir = process.env.SEED_KASIR_PASSWORD || "kasir123";

  const owner = await prisma.user.upsert({
    where: { username: "owner" },
    update: { mustChangePassword: true },
    create: {
      nama: "Owner Toko",
      username: "owner",
      passwordHash: await bcrypt.hash(passwordOwner, 10),
      role: "OWNER",
      mustChangePassword: true,
    },
  });

  const kasir = await prisma.user.upsert({
    where: { username: "kasir" },
    update: { mustChangePassword: true },
    create: {
      nama: "Kasir",
      username: "kasir",
      passwordHash: await bcrypt.hash(passwordKasir, 10),
      role: "KASIR",
      mustChangePassword: true,
    },
  });

  // PRD pasal 7: record UMUM untuk penjualan retail cash tanpa nama.
  const umum = await prisma.party.upsert({
    where: { tipe_nama: { tipe: "CUSTOMER", nama: "UMUM" } },
    update: { isSystem: true, aktif: true },
    create: {
      tipe: "CUSTOMER",
      nama: "UMUM",
      isSystem: true,
      catatan: "Customer retail cash tanpa nama. Tidak boleh dipakai untuk penjualan kredit.",
    },
  });

  console.log("Seed selesai:");
  console.log(`  owner : ${owner.username} / ${passwordOwner}`);
  console.log(`  kasir : ${kasir.username} / ${passwordKasir}`);
  console.log(`  party : ${umum.nama} (sistem)`);
  console.log("");
  console.log("Ganti kedua password setelah login pertama.");
  console.log("Stok awal belum diisi — masukkan lewat menu Stok > Stok Awal (PRD pasal 12).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
