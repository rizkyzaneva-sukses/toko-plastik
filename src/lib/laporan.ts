/**
 * Laporan V1 — PRD pasal 10.
 *
 * Empat angka yang wajib: stok, kas, hutang/piutang, laba kotor.
 * Ditambah saldo pinjaman owner.
 *
 * "Laba kotor boleh lebih besar dari kas. UI owner harus menuliskan kalimat itu
 *  di laporan laba, supaya tidak ditafsirkan sebagai uang yang boleh diambil."
 * Kalimat itu ada di PERINGATAN_LABA di bawah dan dipakai halaman laporan.
 */

import { getPrisma } from "@/lib/prisma";
import { saldoKas, saldoPinjamanOwner } from "@/lib/kas";
import type { SatuanDasar } from "@/lib/satuan";
import { awalHariWIB } from "@/lib/waktu";

export const PERINGATAN_LABA =
  "Laba kotor bukan uang yang boleh diambil. Angka ini bisa lebih besar dari kas " +
  "karena sebagian sudah berubah menjadi stok, piutang, atau sudah dipakai membayar hutang. " +
  "Cek saldo kas sebelum menarik uang.";

export interface BarisStok {
  productId: string;
  nama: string;
  merek: string;
  satuanDasar: SatuanDasar;
  qty: number;
  nilai: number;
  jumlahLot: number;
}

/** PRD pasal 10: qty sisa per SKU + nilai = jumlah (qty_sisa_lot x hpp_lot). */
export async function laporanStok(): Promise<BarisStok[]> {
  const db = getPrisma();

  const produk = await db.product.findMany({
    where: { aktif: true },
    orderBy: [{ nama: "asc" }, { merek: "asc" }],
    select: { id: true, nama: true, merek: true, satuanDasar: true },
  });

  const agg = await db.stockLot.groupBy({
    by: ["productId"],
    where: { aktif: true },
    _sum: { qtySisa: true, hppSisa: true },
    _count: { _all: true },
  });

  const peta = new Map(agg.map((a) => [a.productId, a]));

  return produk.map((p) => {
    const a = peta.get(p.id);
    return {
      productId: p.id,
      nama: p.nama,
      merek: p.merek,
      satuanDasar: p.satuanDasar as SatuanDasar,
      qty: a?._sum.qtySisa ?? 0,
      nilai: Number(a?._sum.hppSisa ?? 0n),
      jumlahLot: a?._count._all ?? 0,
    };
  });
}

export interface LabaKotor {
  omzet: number;
  hpp: number;
  labaKotor: number;
  jumlahNota: number;
  /** Kerugian stok periode ini (susut/rusak/opname kurang). Bukan bagian omzet. */
  kerugianStok: number;
  biayaOperasional: number;
}

/**
 * PRD pasal 10: jumlah (harga jual baris − HPP FIFO baris) untuk nota tidak void.
 * Biaya operasional dan kerugian stok ditampilkan terpisah — keduanya TIDAK
 * mengubah HPP (pasal 4.2), tapi owner tetap perlu melihatnya.
 */
export async function laporanLaba(dari: Date, sampai: Date): Promise<LabaKotor> {
  const db = getPrisma();
  const periode = { gte: dari, lte: sampai };

  const [penjualan, adjust, opex] = await Promise.all([
    db.sale.aggregate({
      where: { status: "AKTIF", tanggal: periode },
      _sum: { total: true, hppTotal: true },
      _count: { _all: true },
    }),
    db.stockAdjustment.aggregate({
      where: { arah: "KURANG", tanggal: periode },
      _sum: { nilaiHpp: true },
    }),
    db.cashEntry.aggregate({
      where: { jenis: "OPEX", tanggal: periode },
      _sum: { nominal: true },
    }),
  ]);

  const omzet = Number(penjualan._sum.total ?? 0n);
  const hpp = Number(penjualan._sum.hppTotal ?? 0n);

  return {
    omzet,
    hpp,
    labaKotor: omzet - hpp,
    jumlahNota: penjualan._count._all,
    kerugianStok: Number(adjust._sum.nilaiHpp ?? 0n),
    biayaOperasional: Number(opex._sum.nominal ?? 0n),
  };
}

/** PRD pasal 10: hutang vendor terbuka, umur berdasarkan tempo hari. */
export async function laporanHutang() {
  const db = getPrisma();
  return db.purchase.findMany({
    where: { status: "AKTIF", cara: "CREDIT", sisaHutang: { gt: 0 } },
    orderBy: [{ jatuhTempo: "asc" }, { tanggal: "asc" }],
    select: {
      id: true,
      nomor: true,
      tanggal: true,
      jatuhTempo: true,
      tempoHari: true,
      total: true,
      sisaHutang: true,
      vendor: { select: { id: true, nama: true } },
    },
  });
}

/** PRD pasal 10: piutang customer terbuka. */
export async function laporanPiutang() {
  const db = getPrisma();
  return db.sale.findMany({
    where: { status: "AKTIF", cara: "CREDIT", sisaPiutang: { gt: 0 } },
    orderBy: [{ jatuhTempo: "asc" }, { tanggal: "asc" }],
    select: {
      id: true,
      nomor: true,
      tanggal: true,
      jatuhTempo: true,
      tempoHari: true,
      total: true,
      sisaPiutang: true,
      customer: { select: { id: true, nama: true } },
    },
  });
}

export interface RingkasanDashboard {
  saldoKas: number;
  nilaiStok: number;
  totalHutang: number;
  totalPiutang: number;
  pinjamanOwner: number;
  omzetHariIni: number;
  labaKotorHariIni: number;
}

export async function ringkasan(): Promise<RingkasanDashboard> {
  const db = getPrisma();

  // "Hari ini" menurut WIB, bukan menurut zona waktu container (yang UTC).
  const awalHari = awalHariWIB();

  const [kas, stok, hutang, piutang, pinjaman, hariIni] = await Promise.all([
    saldoKas(db),
    db.stockLot.aggregate({ where: { aktif: true }, _sum: { hppSisa: true } }),
    db.purchase.aggregate({
      where: { status: "AKTIF", sisaHutang: { gt: 0 } },
      _sum: { sisaHutang: true },
    }),
    db.sale.aggregate({
      where: { status: "AKTIF", sisaPiutang: { gt: 0 } },
      _sum: { sisaPiutang: true },
    }),
    saldoPinjamanOwner(db),
    db.sale.aggregate({
      where: { status: "AKTIF", tanggal: { gte: awalHari } },
      _sum: { total: true, hppTotal: true },
    }),
  ]);

  const omzetHariIni = Number(hariIni._sum.total ?? 0n);
  const hppHariIni = Number(hariIni._sum.hppTotal ?? 0n);

  return {
    saldoKas: Number(kas),
    nilaiStok: Number(stok._sum.hppSisa ?? 0n),
    totalHutang: Number(hutang._sum.sisaHutang ?? 0n),
    totalPiutang: Number(piutang._sum.sisaPiutang ?? 0n),
    pinjamanOwner: Number(pinjaman),
    omzetHariIni,
    labaKotorHariIni: omzetHariIni - hppHariIni,
  };
}

/** Mutasi kas untuk halaman Kas (PRD pasal 10: saldo + mutasi tanggal). */
export async function mutasiKas(dari: Date, sampai: Date) {
  const db = getPrisma();
  const [entri, saldoAwal] = await Promise.all([
    db.cashEntry.findMany({
      where: { tanggal: { gte: dari, lte: sampai } },
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
      take: 500,
      include: { createdBy: { select: { nama: true } } },
    }),
    saldoKas(db, new Date(dari.getTime() - 1)),
  ]);

  return { entri, saldoAwal: Number(saldoAwal) };
}
