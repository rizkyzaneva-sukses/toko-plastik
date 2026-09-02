/**
 * Error domain. Sengaja di file terpisah tanpa dependensi apa pun supaya bisa
 * dipakai lapisan murni (uang.ts, satuan.ts, fifo.ts) tanpa menarik next/server
 * ke dalam unit test.
 *
 * Semua error di sini berarti "input atau keadaan melanggar aturan PRD" dan
 * WAJIB muncul ke user sebagai 400 dengan pesan yang bisa dibaca, bukan 500.
 */

/** Pelanggaran aturan pasal 4 yang harus ditolak dengan pesan jelas. */
export class AturanBisnisError extends Error {
  readonly type = "aturan_bisnis";
  constructor(pesan: string) {
    super(pesan);
    this.name = "AturanBisnisError";
  }
}

/** Dilempar saat stok tidak cukup. PRD A4: seluruh nota ditolak, bukan parsial. */
export class StokKurangError extends Error {
  readonly type = "stok_kurang";
  constructor(
    readonly namaBarang: string,
    readonly diminta: number,
    readonly tersedia: number,
    readonly satuan: string
  ) {
    super(
      `Stok ${namaBarang} tidak cukup. Diminta ${diminta} ${satuan}, tersedia ${tersedia} ${satuan}.`
    );
    this.name = "StokKurangError";
  }
}

/** Pelanggaran pasal 4.1 — satuan/qty tidak valid. */
export class QtyTidakValidError extends Error {
  readonly type = "qty_tidak_valid";
  constructor(pesan: string) {
    super(pesan);
    this.name = "QtyTidakValidError";
  }
}

/** Semua error yang aman ditampilkan apa adanya ke user. */
export function errorDomain(e: unknown): e is AturanBisnisError | StokKurangError | QtyTidakValidError {
  return (
    e instanceof AturanBisnisError ||
    e instanceof StokKurangError ||
    e instanceof QtyTidakValidError
  );
}
