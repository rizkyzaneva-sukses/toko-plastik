import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Semua uang disimpan BigInt (PRD pasal 7). JSON.stringify tidak tahu cara
// menulis BigInt, jadi diajari sekali di sini. Rupiah toko selalu jauh di bawah
// 2^53, sehingga aman menjadi number di sisi UI.
declare global {
  interface BigInt {
    toJSON(): number;
  }
}
if (!(BigInt.prototype as { toJSON?: unknown }).toJSON) {
  Object.defineProperty(BigInt.prototype, "toJSON", {
    value: function (this: bigint) {
      if (this > BigInt(Number.MAX_SAFE_INTEGER) || this < -BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("Nilai rupiah di luar jangkauan aman untuk JSON");
      }
      return Number(this);
    },
    writable: true,
    configurable: true,
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.startsWith("postgres")) {
    throw new Error("DATABASE_URL harus berupa koneksi PostgreSQL");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/**
 * Singleton malas — client baru dibuat saat pertama dipakai, supaya
 * `next build` tidak gagal ketika DATABASE_URL belum tersedia.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createPrismaClient();
  return globalForPrisma.prisma;
}

/** Tipe transaksi Prisma — dipakai semua fungsi domain di src/lib. */
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
