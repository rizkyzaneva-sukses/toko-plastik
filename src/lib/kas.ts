/**
 * Kas — PRD pasal 4.4.
 *
 * "Laba di layar bukan izin menarik uang. Kas toko hanya bergerak jika uang
 * benar-benar pindah."
 *
 * Karena itu HANYA fungsi di file ini yang boleh menulis ke tabel kas, dan
 * setiap penulisan wajib menyebut peristiwa asalnya (refTipe/refId).
 */

import type { Tx } from "@/lib/prisma";
import { getPrisma } from "@/lib/prisma";
import { AturanBisnisError } from "@/lib/api-helpers";

export type JenisKas =
  | "SALE"
  | "PURCHASE"
  | "PAYMENT"
  | "OPEX"
  | "OWNER_LOAN"
  | "OWNER_REPAY"
  | "VOID"
  | "ADJUST"
  | "OPENING"
  | "SETOR_MODAL";

interface CatatKasArgs {
  jenis: JenisKas;
  arah: "MASUK" | "KELUAR";
  nominal: bigint;
  keterangan: string;
  kategori?: string | null;
  refTipe?: string | null;
  refId?: string | null;
  userId: string;
  tanggal?: Date;
}

export async function catatKas(tx: Tx, a: CatatKasArgs) {
  if (a.nominal <= 0n) {
    throw new AturanBisnisError("Nominal kas harus lebih dari 0");
  }
  return tx.cashEntry.create({
    data: {
      jenis: a.jenis,
      arah: a.arah,
      nominal: a.nominal,
      keterangan: a.keterangan,
      kategori: a.kategori ?? null,
      refTipe: a.refTipe ?? null,
      refId: a.refId ?? null,
      createdById: a.userId,
      tanggal: a.tanggal ?? new Date(),
    },
  });
}

/**
 * Saldo kas = total MASUK − total KELUAR.
 * Sengaja dihitung, bukan disimpan sebagai kolom saldo berjalan: kolom berjalan
 * akan salah begitu dua transaksi tersimpan bersamaan.
 */
export async function saldoKas(
  db: Tx | ReturnType<typeof getPrisma> = getPrisma(),
  sampai?: Date
): Promise<bigint> {
  const where = sampai ? { tanggal: { lte: sampai } } : {};

  const [masuk, keluar] = await Promise.all([
    db.cashEntry.aggregate({ where: { ...where, arah: "MASUK" }, _sum: { nominal: true } }),
    db.cashEntry.aggregate({ where: { ...where, arah: "KELUAR" }, _sum: { nominal: true } }),
  ]);

  return (masuk._sum.nominal ?? 0n) - (keluar._sum.nominal ?? 0n);
}

/** Saldo utang owner = total AMBIL − total KEMBALI (PRD pasal 4.4). */
export async function saldoPinjamanOwner(
  db: Tx | ReturnType<typeof getPrisma> = getPrisma()
): Promise<bigint> {
  const [ambil, kembali] = await Promise.all([
    db.ownerLoan.aggregate({
      where: { arah: "AMBIL", status: "AKTIF" },
      _sum: { nominal: true },
    }),
    db.ownerLoan.aggregate({
      where: { arah: "KEMBALI", status: "AKTIF" },
      _sum: { nominal: true },
    }),
  ]);

  return (ambil._sum.nominal ?? 0n) - (kembali._sum.nominal ?? 0n);
}

export const LABEL_JENIS_KAS: Record<JenisKas, string> = {
  SALE: "Penjualan cash",
  PURCHASE: "Pembelian cash",
  PAYMENT: "Pelunasan",
  OPEX: "Biaya operasional",
  OWNER_LOAN: "Pinjaman owner",
  OWNER_REPAY: "Pengembalian owner",
  VOID: "Pembatalan nota",
  ADJUST: "Penyesuaian",
  OPENING: "Saldo awal",
  SETOR_MODAL: "Setoran modal",
};
