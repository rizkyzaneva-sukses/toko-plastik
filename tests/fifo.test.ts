/**
 * Uji kriteria penerimaan PRD pasal 11 yang bisa diuji tanpa database.
 * Yang butuh database (A5-A8, A10-A12) diuji manual lewat checklist di README.
 */

import { describe, it, expect } from "vitest";
import {
  rencanaKonsumsi,
  terapkanKonsumsi,
  totalHpp,
  totalNilai,
  totalStok,
  StokKurangError,
  type LotFifo,
} from "@/lib/fifo";
import { hitungSubtotal, bagiBulat, rupiahDariInput } from "@/lib/uang";

const KONTEKS = { namaBarang: "Gula Pasir Gulaku", satuan: "g" };

describe("A2 — beli 1 karung gula 50 kg, jual 250 g", () => {
  it("sisa stok 49.750 g dan SKU tetap sama", () => {
    // 1 karung = 50.000 g, harga beli Rp 600.000
    const lots: LotFifo[] = [{ lotId: "L1", qtySisa: 50_000, hppSisa: 600_000n }];

    const konsumsi = rencanaKonsumsi(lots, 250, KONTEKS);
    const sesudah = terapkanKonsumsi(lots, konsumsi);

    expect(totalStok(sesudah)).toBe(49_750);
    expect(sesudah).toHaveLength(1); // tidak ada SKU baru
    // 250 g dari 50.000 g seharga 600.000 -> 3.000
    expect(totalHpp(konsumsi)).toBe(3_000n);
    expect(sesudah[0].hppSisa).toBe(597_000n);
  });
});

describe("A3 — dua lot harga beda, jual menembus lot pertama", () => {
  it("HPP pecah sesuai FIFO dan konsumsi lot tersimpan per lot", () => {
    // Contoh wajib PRD pasal 4.2:
    // beli 50 kg @ Rp12.000/kg lalu 50 kg @ Rp14.000/kg, jual 60 kg.
    const lots: LotFifo[] = [
      { lotId: "L1", qtySisa: 50_000, hppSisa: 600_000n }, // 50 kg x 12.000
      { lotId: "L2", qtySisa: 50_000, hppSisa: 700_000n }, // 50 kg x 14.000
    ];

    const konsumsi = rencanaKonsumsi(lots, 60_000, KONTEKS);

    expect(konsumsi).toEqual([
      { lotId: "L1", qty: 50_000, hpp: 600_000n },
      { lotId: "L2", qty: 10_000, hpp: 140_000n },
    ]);
    // (50.000 g x 12) + (10.000 g x 14) = 740.000
    expect(totalHpp(konsumsi)).toBe(740_000n);

    const sesudah = terapkanKonsumsi(lots, konsumsi);
    expect(totalStok(sesudah)).toBe(40_000);
    // Sisa 40.000 g tetap @ harga lot kedua: 40.000 x 14 = 560.000
    expect(sesudah[1].hppSisa).toBe(560_000n);
    expect(Number(sesudah[1].hppSisa) / sesudah[1].qtySisa).toBe(14);
  });

  it("lot pertama habis tanpa menyisakan rupiah nyangkut", () => {
    // Angka yang tidak habis dibagi: 3 g seharga Rp 10.
    const lots: LotFifo[] = [
      { lotId: "L1", qtySisa: 3, hppSisa: 10n },
      { lotId: "L2", qtySisa: 5, hppSisa: 100n },
    ];

    const konsumsi = rencanaKonsumsi(lots, 3, KONTEKS);
    const sesudah = terapkanKonsumsi(lots, konsumsi);

    expect(konsumsi[0].hpp).toBe(10n); // seluruh sisa lot, bukan 3 x pembulatan
    expect(sesudah[0].qtySisa).toBe(0);
    expect(sesudah[0].hppSisa).toBe(0n);
  });

  it("nilai stok total tidak pernah bocor setelah banyak penjualan sebagian", () => {
    let lots: LotFifo[] = [
      { lotId: "L1", qtySisa: 1_000, hppSisa: 13_499n }, // harga ganjil
    ];
    const nilaiAwal = totalNilai(lots);

    let hppTerpakai = 0n;
    for (let i = 0; i < 7; i++) {
      const k = rencanaKonsumsi(lots, 137, KONTEKS);
      hppTerpakai += totalHpp(k);
      lots = terapkanKonsumsi(lots, k);
    }

    // Nilai yang keluar + nilai yang tersisa harus persis sama dengan nilai awal.
    expect(hppTerpakai + totalNilai(lots)).toBe(nilaiAwal);
    expect(totalStok(lots)).toBe(1_000 - 7 * 137);
  });
});

describe("A4 — jual melebihi stok", () => {
  it("ditolak seluruhnya, tidak memotong sebagian", () => {
    const lots: LotFifo[] = [{ lotId: "L1", qtySisa: 500, hppSisa: 7_000n }];

    expect(() => rencanaKonsumsi(lots, 501, KONTEKS)).toThrow(StokKurangError);

    // Daftar lot asli tidak boleh berubah — rencanaKonsumsi murni.
    expect(lots[0].qtySisa).toBe(500);
    expect(lots[0].hppSisa).toBe(7_000n);
  });

  it("pesan errornya menyebut angka yang bisa dibaca kasir", () => {
    const lots: LotFifo[] = [{ lotId: "L1", qtySisa: 500, hppSisa: 7_000n }];
    try {
      rencanaKonsumsi(lots, 1_000, KONTEKS);
      expect.unreachable("seharusnya melempar");
    } catch (e) {
      expect((e as StokKurangError).message).toContain("tersedia 500 g");
    }
  });

  it("stok kosong sama sekali juga ditolak", () => {
    expect(() => rencanaKonsumsi([], 1, KONTEKS)).toThrow(StokKurangError);
  });
});

describe("A9 — susut 500 g memotong lot FIFO", () => {
  it("memakai jalur yang sama dengan penjualan dan mencatat nilai kerugian", () => {
    const lots: LotFifo[] = [
      { lotId: "L1", qtySisa: 300, hppSisa: 3_600n },
      { lotId: "L2", qtySisa: 1_000, hppSisa: 14_000n },
    ];

    const konsumsi = rencanaKonsumsi(lots, 500, KONTEKS);

    expect(konsumsi).toHaveLength(2);
    expect(konsumsi[0]).toEqual({ lotId: "L1", qty: 300, hpp: 3_600n });
    expect(konsumsi[1]).toEqual({ lotId: "L2", qty: 200, hpp: 2_800n });
    // Kerugian stok = 6.400, dan ini BUKAN omzet.
    expect(totalHpp(konsumsi)).toBe(6_400n);
  });
});

describe("A13 — plastik dijual per iket", () => {
  it("tidak ada konversi gram di transaksi", () => {
    const lots: LotFifo[] = [{ lotId: "P1", qtySisa: 20, hppSisa: 400_000n }];
    const konsumsi = rencanaKonsumsi(lots, 3, {
      namaBarang: "Plastik PE Bening",
      satuan: "iket",
    });

    expect(konsumsi).toEqual([{ lotId: "P1", qty: 3, hpp: 60_000n }]);
  });
});

describe("A14 — merek A vs B ukuran sama = dua antrian lot", () => {
  it("antrian lot dipisah per produk, tidak saling memakan", () => {
    const merekA: LotFifo[] = [{ lotId: "A1", qtySisa: 10_000, hppSisa: 120_000n }];
    const merekB: LotFifo[] = [{ lotId: "B1", qtySisa: 10_000, hppSisa: 140_000n }];

    const kA = rencanaKonsumsi(merekA, 10_000, KONTEKS);
    expect(totalHpp(kA)).toBe(120_000n);

    const kB = rencanaKonsumsi(merekB, 10_000, KONTEKS);
    expect(totalHpp(kB)).toBe(140_000n);

    // Menjual habis merek A tidak boleh membuat merek B ikut berkurang.
    expect(totalStok(terapkanKonsumsi(merekB, kB))).toBe(0);
    expect(merekA[0].qtySisa).toBe(10_000);
  });
});

describe("qty harus integer di lapisan FIFO juga", () => {
  it("menolak qty desimal walau lolos dari layar", () => {
    const lots: LotFifo[] = [{ lotId: "L1", qtySisa: 1_000, hppSisa: 10_000n }];
    expect(() => rencanaKonsumsi(lots, 250.5, KONTEKS)).toThrow(/bilangan bulat/i);
  });

  it("menolak qty nol dan negatif", () => {
    const lots: LotFifo[] = [{ lotId: "L1", qtySisa: 1_000, hppSisa: 10_000n }];
    expect(() => rencanaKonsumsi(lots, 0, KONTEKS)).toThrow(/lebih dari 0/i);
    expect(() => rencanaKonsumsi(lots, -5, KONTEKS)).toThrow(/lebih dari 0/i);
  });
});

describe("aritmetika uang — pasal 7, tanpa floating point", () => {
  it("bagiBulat membulatkan setengah ke atas", () => {
    expect(bagiBulat(5n, 2n)).toBe(3n);
    expect(bagiBulat(4n, 2n)).toBe(2n);
    expect(bagiBulat(1n, 3n)).toBe(0n);
    expect(bagiBulat(2n, 3n)).toBe(1n);
  });

  it("harga per kg tetap menghasilkan rupiah bulat untuk qty gram", () => {
    // Rp 13.500 per 1000 g -> 250 g = Rp 3.375
    expect(hitungSubtotal(13_500, 250, 1_000)).toBe(3_375n);
    // Rp 13.500 per 1000 g -> 1 g = Rp 14 (13,5 dibulatkan ke atas)
    expect(hitungSubtotal(13_500, 1, 1_000)).toBe(14n);
    // Plastik Rp 25.000 per iket -> 3 iket
    expect(hitungSubtotal(25_000, 3, 1)).toBe(75_000n);
  });

  it("menolak nominal berdesimal dan negatif", () => {
    expect(() => rupiahDariInput(1_000.5)).toThrow(/rupiah bulat/i);
    expect(() => rupiahDariInput(-1)).toThrow(/negatif/i);
    expect(rupiahDariInput("Rp 1.250.000")).toBe(1_250_000n);
  });
});
