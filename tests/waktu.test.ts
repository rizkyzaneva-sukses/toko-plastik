/**
 * Batas hari WIB — regresi untuk bug yang ditemukan saat debug.
 *
 * Container produksi berjalan TZ=UTC. Sebelum diperbaiki, laporan "hari ini"
 * memakai tengah malam UTC (= 07:00 WIB), sehingga seluruh penjualan antara
 * 00:00 dan 07:00 WIB masuk ke hari yang salah. Di laptop yang sudah WIB,
 * bug ini tidak terlihat sama sekali — karena itu uji di bawah memaksa
 * perbandingan terhadap offset +07:00 yang eksplisit, bukan terhadap zona
 * waktu mesin yang menjalankan test.
 */

import { describe, it, expect } from "vitest";
import { awalHariWIB, akhirHariWIB, hariWIB, rentangLaporanWIB } from "@/lib/waktu";

describe("batas hari mengikuti WIB, bukan zona waktu server", () => {
  it("awal hari WIB = 17:00 UTC hari sebelumnya", () => {
    expect(awalHariWIB("2026-09-03").toISOString()).toBe("2026-09-02T17:00:00.000Z");
  });

  it("akhir hari WIB = 16:59:59.999 UTC hari yang sama", () => {
    expect(akhirHariWIB("2026-09-03").toISOString()).toBe("2026-09-03T16:59:59.999Z");
  });

  it("transaksi pukul 02:00 WIB masuk ke hari itu, bukan hari sebelumnya", () => {
    // 2026-09-03 02:00 WIB = 2026-09-02 19:00 UTC.
    const transaksi = new Date("2026-09-02T19:00:00.000Z");
    const { dari, sampai } = rentangLaporanWIB("2026-09-03", "2026-09-03");

    expect(transaksi >= dari).toBe(true);
    expect(transaksi <= sampai).toBe(true);
    expect(hariWIB(transaksi)).toBe("2026-09-03");
  });

  it("transaksi pukul 23:00 WIB tidak bocor ke hari berikutnya", () => {
    // 2026-09-03 23:00 WIB = 2026-09-03 16:00 UTC.
    const transaksi = new Date("2026-09-03T16:00:00.000Z");
    const hariIni = rentangLaporanWIB("2026-09-03", "2026-09-03");
    const besok = rentangLaporanWIB("2026-09-04", "2026-09-04");

    expect(transaksi >= hariIni.dari && transaksi <= hariIni.sampai).toBe(true);
    expect(transaksi >= besok.dari && transaksi <= besok.sampai).toBe(false);
  });

  it("rentang satu hari tepat 24 jam, tanpa celah antar hari", () => {
    const a = rentangLaporanWIB("2026-09-03", "2026-09-03");
    const b = rentangLaporanWIB("2026-09-04", "2026-09-04");

    expect(a.sampai.getTime() - a.dari.getTime()).toBe(24 * 60 * 60 * 1000 - 1);
    expect(b.dari.getTime() - a.sampai.getTime()).toBe(1);
  });

  it("parameter kosong atau ngawur jatuh ke bawaan, bukan Invalid Date", () => {
    const r = rentangLaporanWIB(null, undefined);
    expect(Number.isNaN(r.dari.getTime())).toBe(false);
    expect(Number.isNaN(r.sampai.getTime())).toBe(false);
    expect(r.sampai > r.dari).toBe(true);

    const s = rentangLaporanWIB("bukan-tanggal", "juga-bukan");
    expect(Number.isNaN(s.dari.getTime())).toBe(false);
    expect(hariWIB(s.sampai)).toBe(hariWIB());
  });

  it("rentang terbalik ditolak", () => {
    expect(() => rentangLaporanWIB("2026-09-10", "2026-09-01")).toThrow(/lebih besar/i);
  });

  it("rentang bawaan 30 hari", () => {
    const { dari, sampai } = rentangLaporanWIB(null, "2026-09-30");
    expect(hariWIB(dari)).toBe("2026-09-01");
    expect(hariWIB(sampai)).toBe("2026-09-30");
  });
});
