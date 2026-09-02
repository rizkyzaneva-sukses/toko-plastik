/**
 * Batas hari menurut WIB — PRD pasal 8: "timezone tampilan WIB".
 *
 * MASALAH YANG DIPERBAIKI DI SINI:
 * Container produksi berjalan dengan TZ=UTC. `new Date("2026-09-03")` menjadi
 * 2026-09-03T00:00Z, padahal itu baru pukul 07:00 WIB. Akibatnya laporan
 * "hari ini" melewatkan seluruh penjualan antara 00:00 dan 07:00 WIB, dan
 * memasukkan transaksi sore sebelumnya ke hari yang salah.
 *
 * Di laptop pengembang yang zona waktunya sudah WIB, bug ini tidak terlihat
 * sama sekali. Karena itu offsetnya ditulis eksplisit, bukan mengandalkan
 * zona waktu mesin.
 *
 * WIB = UTC+7 tetap, tidak mengenal daylight saving.
 */

const OFFSET_WIB = "+07:00";

function validTanggal(teks: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(teks);
}

/** 'YYYY-MM-DD' menurut WIB untuk sebuah Date. */
export function hariWIB(saat: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(saat);
}

/** Pukul 00:00:00.000 WIB pada tanggal tersebut, sebagai Date (UTC di dalamnya). */
export function awalHariWIB(tanggal: string | Date = new Date()): Date {
  const teks = typeof tanggal === "string" ? tanggal : hariWIB(tanggal);
  if (!validTanggal(teks)) throw new Error(`Tanggal tidak valid: ${teks}`);
  return new Date(`${teks}T00:00:00.000${OFFSET_WIB}`);
}

/** Pukul 23:59:59.999 WIB pada tanggal tersebut. */
export function akhirHariWIB(tanggal: string | Date = new Date()): Date {
  const teks = typeof tanggal === "string" ? tanggal : hariWIB(tanggal);
  if (!validTanggal(teks)) throw new Error(`Tanggal tidak valid: ${teks}`);
  return new Date(`${teks}T23:59:59.999${OFFSET_WIB}`);
}

/**
 * Rentang laporan dari dua parameter query 'YYYY-MM-DD'.
 * Keduanya boleh kosong: default 30 hari terakhir sampai hari ini menurut WIB.
 */
export function rentangLaporanWIB(
  dariParam?: string | null,
  sampaiParam?: string | null
): { dari: Date; sampai: Date } {
  const hariIni = hariWIB();

  const sampaiTeks = dariAtau(sampaiParam, hariIni);
  const sampai = akhirHariWIB(sampaiTeks);

  const dariBawaan = hariWIB(new Date(sampai.getTime() - 29 * 24 * 60 * 60 * 1000));
  const dari = awalHariWIB(dariAtau(dariParam, dariBawaan));

  if (dari > sampai) {
    throw new Error("Tanggal mulai lebih besar daripada tanggal akhir");
  }
  return { dari, sampai };
}

function dariAtau(nilai: string | null | undefined, bawaan: string): string {
  const teks = (nilai ?? "").trim();
  return validTanggal(teks) ? teks : bawaan;
}
