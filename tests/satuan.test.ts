/**
 * PRD pasal 4.1 — satuan tidak dinegosiasikan.
 * A1: input jual 0,25 kg harus DITOLAK, bukan dibulatkan diam-diam.
 */

import { describe, it, expect } from "vitest";
import {
  parseQtyDasar,
  keSatuanDasar,
  formatQty,
  formatQtyPanjang,
  tombolCepat,
  QtyTidakValidError,
} from "@/lib/satuan";

describe("A1 — input jual 0,25 kg ditolak", () => {
  it("menolak koma sebagai desimal", () => {
    expect(() => parseQtyDasar("0,25", "GRAM")).toThrow(QtyTidakValidError);
    expect(() => parseQtyDasar("0,25", "GRAM")).toThrow(/250/); // pesannya mengajari
  });

  it("menolak titik sebagai desimal", () => {
    expect(() => parseQtyDasar("0.5", "GRAM")).toThrow(QtyTidakValidError);
  });

  it("menerima 250 sebagai gram bulat", () => {
    expect(parseQtyDasar("250", "GRAM")).toBe(250);
    expect(parseQtyDasar(1_000, "GRAM")).toBe(1_000);
  });

  it("menolak nol, negatif, dan bukan angka", () => {
    expect(() => parseQtyDasar("0", "GRAM")).toThrow(/lebih dari 0/i);
    expect(() => parseQtyDasar("-5", "GRAM")).toThrow(/lebih dari 0/i);
    expect(() => parseQtyDasar("abc", "GRAM")).toThrow(/angka/i);
    expect(() => parseQtyDasar("", "GRAM")).toThrow(/wajib/i);
  });

  it("iket dan pcs juga wajib bulat", () => {
    expect(() => parseQtyDasar("1,5", "IKET")).toThrow(/iket bulat/i);
    expect(() => parseQtyDasar("2.5", "PCS")).toThrow(/pcs bulat/i);
    expect(parseQtyDasar("3", "IKET")).toBe(3);
  });
});

describe("pasal 6.1 — konversi satuan beli", () => {
  it("1 karung 50 kg menjadi 50.000 gram", () => {
    expect(keSatuanDasar(1, 50_000)).toBe(50_000);
    expect(keSatuanDasar(3, 50_000)).toBe(150_000);
  });

  it("gagal kalau konversi master kosong atau tidak masuk akal", () => {
    expect(() => keSatuanDasar(1, 0)).toThrow(/konversi/i);
    expect(() => keSatuanDasar(1, -1)).toThrow(/konversi/i);
  });

  it("plastik memakai konversi 1 — tidak ada konversi gram", () => {
    expect(keSatuanDasar(5, 1)).toBe(5);
  });
});

describe("pasal 8 — tampilan satuan jual, bukan pecahan karung", () => {
  it("stok ditampilkan sebagai gram, bukan 0,05 karung", () => {
    expect(formatQty(49_750, "GRAM")).toBe("49.750 g");
    expect(formatQty(12, "IKET")).toBe("12 iket");
  });

  it("kg hanya keterangan tambahan di layar", () => {
    expect(formatQtyPanjang(1_500, "GRAM")).toBe("1.500 g (1,5 kg)");
    expect(formatQtyPanjang(999, "GRAM")).toBe("999 g");
  });

  it("label 1 kg hanya menempel di tombol 1000 g", () => {
    const tombol = tombolCepat("GRAM");
    const satuKg = tombol.find((t) => t.label === "1 kg");
    expect(satuKg?.qty).toBe(1_000); // yang tersimpan tetap 1000 gram
    expect(tombol.map((t) => t.qty)).toEqual([100, 250, 500, 1_000]);
  });

  it("plastik dan pcs punya tombol sendiri tanpa gram", () => {
    expect(tombolCepat("IKET").every((t) => t.label.includes("iket"))).toBe(true);
    expect(tombolCepat("PCS").every((t) => t.label.includes("pcs"))).toBe(true);
  });
});
