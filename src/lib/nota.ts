/**
 * Penomoran nota. Nomor dibentuk di dalam transaksi dan baris counter dikunci,
 * supaya dua kasir yang menyimpan bersamaan tidak pernah mendapat nomor sama
 * (PRD pasal 13: "Dua kasir bentrok lot").
 */

import type { Tx } from "@/lib/prisma";
import { hariWIB } from "@/lib/waktu";

export type PrefixNota = "JL" | "PB" | "BY" | "TR" | "PJ";

const NAMA: Record<PrefixNota, string> = {
  JL: "Penjualan",
  PB: "Pembelian",
  BY: "Pembayaran",
  TR: "Penyesuaian stok",
  PJ: "Pinjaman owner",
};

export function namaDokumen(prefix: PrefixNota) {
  return NAMA[prefix];
}

/**
 * Contoh hasil: "JL-20260902-0007".
 * Tanggal memakai WIB supaya penomoran ikut hari kerja toko, bukan UTC.
 */
export async function nomorBerikutnya(tx: Tx, prefix: PrefixNota): Promise<string> {
  const hari = hariWIB().replace(/-/g, "");
  const key = `${prefix}-${hari}`;

  // upsert + increment dalam satu pernyataan: Postgres mengunci barisnya sendiri.
  const counter = await tx.notaCounter.upsert({
    where: { key },
    create: { key, terakhir: 1 },
    update: { terakhir: { increment: 1 } },
  });

  return `${key}-${String(counter.terakhir).padStart(4, "0")}`;
}
