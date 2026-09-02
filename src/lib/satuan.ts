/**
 * Satuan — PRD pasal 4.1. Tidak dinegosiasikan.
 *
 * Dilarang input kg desimal (0,25 kg / 0,5 kg). Bahan kue yang dipecah memakai
 * GRAM bulat, plastik memakai IKET, barang utuh memakai PCS. Database hanya
 * integer.
 */

import { QtyTidakValidError } from "@/lib/errors";

export { QtyTidakValidError };

export type SatuanDasar = "GRAM" | "IKET" | "PCS";

export const SATUAN_LABEL: Record<SatuanDasar, string> = {
  GRAM: "g",
  IKET: "iket",
  PCS: "pcs",
};

export const SATUAN_OPSI: { value: SatuanDasar; label: string; hint: string }[] = [
  { value: "GRAM", label: "Gram (g)", hint: "Gula, tepung, mentega, maizena — dipecah dari karung/dus" },
  { value: "IKET", label: "Iket", hint: "Plastik — tulisan 10 kg/20 kg di karung hanya catatan" },
  { value: "PCS", label: "Pcs", hint: "Barang utuh, beli dan jual sama-sama pcs" },
];

/** Tombol cepat kasir. PRD pasal 6.2 dan pasal 8. */
export const TOMBOL_GRAM = [
  { qty: 100, label: "100 g" },
  { qty: 250, label: "250 g" },
  { qty: 500, label: "500 g" },
  // Label "1 kg" hanya di tombol ini. Yang tersimpan tetap 1000 gram (pasal 8).
  { qty: 1000, label: "1 kg" },
];

export const TOMBOL_IKET = [1, 2, 5, 10].map((q) => ({ qty: q, label: `${q} iket` }));
export const TOMBOL_PCS = [1, 2, 5, 10].map((q) => ({ qty: q, label: `${q} pcs` }));

export function tombolCepat(satuan: SatuanDasar) {
  if (satuan === "GRAM") return TOMBOL_GRAM;
  if (satuan === "IKET") return TOMBOL_IKET;
  return TOMBOL_PCS;
}

/** Tampilan qty untuk kasir: "49.750 g", "12 iket". Bukan "0,05 karung" (pasal 8). */
export function formatQty(qty: number, satuan: SatuanDasar): string {
  const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(qty);
  return `${angka} ${SATUAN_LABEL[satuan]}`;
}

/**
 * Tampilan tambahan untuk gram: "1.500 g (1,5 kg)". Kg hanya keterangan di layar,
 * tidak pernah menjadi angka yang disimpan atau diinput.
 */
export function formatQtyPanjang(qty: number, satuan: SatuanDasar): string {
  const dasar = formatQty(qty, satuan);
  if (satuan !== "GRAM" || qty < 1000) return dasar;
  const kg = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(qty / 1000);
  return `${dasar} (${kg} kg)`;
}

/**
 * Gerbang pasal 4.1. Menerima apa pun dari input user, mengembalikan integer
 * satuan dasar — atau menolak.
 *
 * PRD A1: input jual 0,25 kg harus DITOLAK, bukan diam-diam dibulatkan.
 */
export function parseQtyDasar(nilai: unknown, satuan: SatuanDasar): number {
  const teks = typeof nilai === "string" ? nilai.trim() : String(nilai ?? "");

  if (teks === "") throw new QtyTidakValidError("Qty wajib diisi");

  // Koma maupun titik desimal sama-sama ditolak, bukan dinormalisasi.
  if (/[.,]/.test(teks)) {
    throw new QtyTidakValidError(
      satuan === "GRAM"
        ? "Qty desimal tidak diterima. Tulis dalam gram bulat, contoh 250 (bukan 0,25 kg)."
        : `Qty desimal tidak diterima. Tulis ${SATUAN_LABEL[satuan]} bulat.`
    );
  }

  const n = Number(teks);
  if (!Number.isFinite(n)) throw new QtyTidakValidError("Qty harus berupa angka");
  if (!Number.isInteger(n)) {
    throw new QtyTidakValidError(`Qty harus bilangan bulat dalam ${SATUAN_LABEL[satuan]}`);
  }
  if (n <= 0) throw new QtyTidakValidError("Qty harus lebih dari 0");
  if (n > BATAS_QTY) {
    throw new QtyTidakValidError(
      `Qty terlalu besar. Maksimal ${new Intl.NumberFormat("id-ID").format(BATAS_QTY)} ` +
        `${SATUAN_LABEL[satuan]} dalam satu baris.`
    );
  }

  return n;
}

/**
 * Batas atas qty satuan dasar dalam satu baris.
 *
 * Kolom qty di database adalah INT4 (maksimal 2.147.483.647). Tanpa penjagaan
 * ini, "beli 100.000 karung" menjadi 5 miliar gram dan Postgres menolaknya
 * dengan error mentah — user cuma melihat "kesalahan di server".
 * 100 juta gram = 100 ton; jauh di atas kebutuhan satu toko.
 */
export const BATAS_QTY = 100_000_000;

/** Konversi qty satuan beli -> satuan dasar. PRD pasal 6.1. */
export function keSatuanDasar(qtyBeli: number, konversi: number): number {
  if (!Number.isInteger(qtyBeli) || qtyBeli <= 0) {
    throw new QtyTidakValidError("Qty beli harus bilangan bulat positif");
  }
  if (!Number.isInteger(konversi) || konversi <= 0) {
    // PRD pasal 6.1: gagal kalau konversi master kosong.
    throw new QtyTidakValidError(
      "Konversi satuan beli di master barang belum diisi. Lengkapi dulu sebelum membeli."
    );
  }

  const hasil = qtyBeli * konversi;
  if (hasil > BATAS_QTY) {
    throw new QtyTidakValidError(
      `Qty beli terlalu besar: ${new Intl.NumberFormat("id-ID").format(qtyBeli)} x ` +
        `${new Intl.NumberFormat("id-ID").format(konversi)} = ` +
        `${new Intl.NumberFormat("id-ID").format(hasil)}, melebihi batas ` +
        `${new Intl.NumberFormat("id-ID").format(BATAS_QTY)}. Periksa lagi qty dan konversinya.`
    );
  }
  return hasil;
}
