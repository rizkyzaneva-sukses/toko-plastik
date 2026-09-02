/**
 * FIFO — PRD pasal 4.2.
 *
 * Fungsi di sini SENGAJA murni (tanpa Prisma, tanpa I/O) supaya bisa diuji
 * langsung terhadap kriteria penerimaan A2, A3, A4, A9, dan A13.
 *
 * Model nilai lot: setiap lot menyimpan `qtySisa` (Int) dan `hppSisa` (BigInt).
 * Saat sebuah lot habis, HPP yang dikonsumsi = seluruh `hppSisa` — jadi tidak
 * pernah ada sisa rupiah nyangkut karena pembulatan. Saat lot dipotong
 * sebagian, HPP dibagi proporsional dengan pembulatan setengah ke atas.
 */

import { bagiBulat } from "@/lib/uang";
import { StokKurangError, QtyTidakValidError } from "@/lib/errors";

export { StokKurangError };

export interface LotFifo {
  lotId: string;
  qtySisa: number;
  hppSisa: bigint;
}

export interface KonsumsiLot {
  lotId: string;
  qty: number;
  hpp: bigint;
}

/** Total stok dari daftar lot. */
export function totalStok(lots: LotFifo[]): number {
  return lots.reduce((a, l) => a + l.qtySisa, 0);
}

/** Total nilai HPP dari daftar lot. PRD pasal 10: nilai stok. */
export function totalNilai(lots: LotFifo[]): bigint {
  return lots.reduce((a, l) => a + l.hppSisa, 0n);
}

/**
 * Potong `qtyDiminta` dari antrian lot yang SUDAH terurut tertua dulu.
 * Tidak mengubah `lots`; hanya mengembalikan rencana konsumsi.
 *
 * @throws StokKurangError kalau total stok kurang — tidak pernah memotong sebagian.
 */
export function rencanaKonsumsi(
  lots: LotFifo[],
  qtyDiminta: number,
  konteks: { namaBarang: string; satuan: string }
): KonsumsiLot[] {
  if (!Number.isInteger(qtyDiminta)) {
    throw new QtyTidakValidError("Qty harus bilangan bulat. Gram desimal tidak diterima.");
  }
  if (qtyDiminta <= 0) {
    throw new QtyTidakValidError("Qty harus lebih dari 0");
  }

  const tersedia = totalStok(lots);
  if (tersedia < qtyDiminta) {
    throw new StokKurangError(konteks.namaBarang, qtyDiminta, tersedia, konteks.satuan);
  }

  const hasil: KonsumsiLot[] = [];
  let sisa = qtyDiminta;

  for (const lot of lots) {
    if (sisa === 0) break;
    if (lot.qtySisa <= 0) continue;

    const ambil = Math.min(lot.qtySisa, sisa);
    // Lot habis -> ambil seluruh sisa nilainya. Tidak ada rupiah yang nyangkut.
    const hpp =
      ambil === lot.qtySisa
        ? lot.hppSisa
        : bagiBulat(lot.hppSisa * BigInt(ambil), BigInt(lot.qtySisa));

    hasil.push({ lotId: lot.lotId, qty: ambil, hpp });
    sisa -= ambil;
  }

  return hasil;
}

/** Jumlah HPP dari rencana konsumsi. */
export function totalHpp(konsumsi: KonsumsiLot[]): bigint {
  return konsumsi.reduce((a, k) => a + k.hpp, 0n);
}

/**
 * Terapkan rencana konsumsi ke salinan daftar lot. Dipakai di test dan untuk
 * simulasi di layar; penerapan sebenarnya ke database ada di `src/lib/stok.ts`.
 */
export function terapkanKonsumsi(lots: LotFifo[], konsumsi: KonsumsiLot[]): LotFifo[] {
  const peta = new Map(konsumsi.map((k) => [k.lotId, k]));
  return lots.map((l) => {
    const k = peta.get(l.lotId);
    if (!k) return { ...l };
    return { lotId: l.lotId, qtySisa: l.qtySisa - k.qty, hppSisa: l.hppSisa - k.hpp };
  });
}

/** HPP rata-rata per satuan dasar untuk DITAMPILKAN saja. Jangan disimpan. */
export function hppPerUnitTampilan(lot: LotFifo): number {
  if (lot.qtySisa <= 0) return 0;
  return Number(lot.hppSisa) / lot.qtySisa;
}
