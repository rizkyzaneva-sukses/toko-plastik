/**
 * Format angka saat diketik — dipakai AngkaInput/RupiahInput.
 * Yang diuji terutama posisi caret: kalau ini salah, kursor melompat ke ujung
 * setiap kali titik ribuan bertambah dan input jadi tidak bisa dipakai.
 */

import { describe, it, expect } from "vitest";
import { formatRibuan, posisiSetelahDigitKe } from "@/lib/utils";

describe("formatRibuan", () => {
  it("memberi titik tiap tiga digit", () => {
    expect(formatRibuan("1000000")).toBe("1.000.000");
    expect(formatRibuan("600000")).toBe("600.000");
    expect(formatRibuan("250")).toBe("250");
  });

  it("kosong tetap kosong, bukan 0", () => {
    expect(formatRibuan("")).toBe("");
  });

  it("membuang karakter selain digit", () => {
    expect(formatRibuan("1.000.000")).toBe("1.000.000");
    expect(formatRibuan("Rp 1.500x")).toBe("1.500");
    expect(formatRibuan("-50")).toBe("50");
  });

  it("nol di depan dinormalkan", () => {
    expect(formatRibuan("007")).toBe("7");
  });
});

describe("posisiSetelahDigitKe", () => {
  it("nol digit berarti caret di paling kiri", () => {
    expect(posisiSetelahDigitKe("1.000.000", 0)).toBe(0);
  });

  it("melompati titik saat menghitung digit", () => {
    // "1.000.000" — digit ke-1 ada di indeks 0, jadi caret berhenti di 1.
    expect(posisiSetelahDigitKe("1.000.000", 1)).toBe(1);
    // digit ke-2 ada di indeks 2 (setelah titik), caret di 3.
    expect(posisiSetelahDigitKe("1.000.000", 2)).toBe(3);
    // digit ke-4 ada di indeks 4, caret di 5.
    expect(posisiSetelahDigitKe("1.000.000", 4)).toBe(5);
  });

  it("digit terakhir menaruh caret di ujung", () => {
    expect(posisiSetelahDigitKe("1.000.000", 7)).toBe(9);
  });

  it("permintaan melebihi jumlah digit tetap di ujung, tidak error", () => {
    expect(posisiSetelahDigitKe("1.000", 99)).toBe(5);
    expect(posisiSetelahDigitKe("", 3)).toBe(0);
  });

  it("mengetik di tengah angka: caret tetap menempel pada digit yang sama", () => {
    // Tim mengetik "1500000" lalu menyisipkan "2" sesudah digit ke-2.
    const sesudah = formatRibuan("15200000");
    expect(sesudah).toBe("15.200.000");
    // Caret harus berada tepat setelah digit ke-3 ("2"), yaitu indeks 4.
    expect(posisiSetelahDigitKe(sesudah, 3)).toBe(4);
  });
});
