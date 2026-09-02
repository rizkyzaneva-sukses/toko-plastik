/**
 * Aritmetika uang & qty. PRD pasal 7: tidak ada floating point untuk uang
 * maupun stok. Semua di sini bekerja dengan BigInt (rupiah) dan number integer
 * (qty satuan dasar).
 *
 * Semua penolakan memakai AturanBisnisError supaya sampai ke user sebagai 400
 * berpesan, bukan 500 "Terjadi kesalahan di server".
 */

import { AturanBisnisError } from "@/lib/errors";

/** Pembulatan setengah ke atas untuk pembagian BigInt. Hasil tetap BigInt. */
export function bagiBulat(pembilang: bigint, penyebut: bigint): bigint {
  if (penyebut === 0n) throw new AturanBisnisError("Pembagi tidak boleh nol");
  if (penyebut < 0n) return bagiBulat(-pembilang, -penyebut);
  if (pembilang >= 0n) return (pembilang * 2n + penyebut) / (penyebut * 2n);
  return -((-pembilang * 2n + penyebut) / (penyebut * 2n));
}

/**
 * Subtotal baris jual. Harga disimpan sebagai `hargaRef` rupiah per `qtyRef`
 * satuan dasar (mis. Rp 13.500 per 1000 g), supaya "Rp 13,5 per gram" tetap
 * terhitung tanpa desimal.
 */
export function hitungSubtotal(hargaRef: number, qty: number, qtyRef: number): bigint {
  if (!Number.isInteger(hargaRef) || hargaRef < 0) {
    throw new AturanBisnisError("Harga harus rupiah bulat dan tidak negatif");
  }
  if (!Number.isInteger(qtyRef) || qtyRef <= 0) {
    throw new AturanBisnisError("Qty referensi harga harus bilangan bulat positif");
  }
  return bagiBulat(BigInt(hargaRef) * BigInt(qty), BigInt(qtyRef));
}

/** Angka rupiah dari input user. Menolak desimal, negatif, dan bukan angka. */
export function rupiahDariInput(nilai: unknown, label = "Nominal"): bigint {
  // Angka dibaca apa adanya; hanya string yang dibersihkan dari titik/spasi
  // pemisah ribuan. Angka negatif tetap terbaca negatif lalu ditolak di bawah.
  const n =
    typeof nilai === "string" ? Number(nilai.replace(/[^\d-]/g, "")) : Number(nilai);

  if (!Number.isFinite(n)) throw new AturanBisnisError(`${label} tidak valid`);
  if (!Number.isInteger(n)) {
    throw new AturanBisnisError(`${label} harus rupiah bulat, tanpa desimal`);
  }
  if (n < 0) throw new AturanBisnisError(`${label} tidak boleh negatif`);
  if (!Number.isSafeInteger(n)) throw new AturanBisnisError(`${label} terlalu besar`);
  return BigInt(n);
}

/** BigInt -> number untuk dikirim ke UI. Rupiah toko selalu jauh di bawah 2^53. */
export function keNumber(nilai: bigint): number {
  if (nilai > BigInt(Number.MAX_SAFE_INTEGER) || nilai < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new AturanBisnisError("Nilai rupiah di luar jangkauan aman");
  }
  return Number(nilai);
}
