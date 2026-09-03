/**
 * Dashboard komprehensif — agregasi data untuk halaman utama owner.
 *
 * Semua angka uang di-return sebagai number (sudah Number(BigInt)).
 * Waktu menggunakan WIB (lewat src/lib/waktu.ts), bukan zona waktu container.
 */

import { getPrisma } from "@/lib/prisma";
import { saldoKas, saldoPinjamanOwner } from "@/lib/kas";
import { awalHariWIB, akhirHariWIB, hariWIB } from "@/lib/waktu";

// ---------------------------------------------------------------
// Ringkasan kartu utama (sudah ada di laporan.ts, reuse dari sini)
// ---------------------------------------------------------------

export interface KartuRingkasan {
  saldoKas: number;
  nilaiStok: number;
  totalHutang: number;
  totalPiutang: number;
  pinjamanOwner: number;
  omzetHariIni: number;
  labaKotorHariIni: number;
  jumlahNotaHariIni: number;
}

export async function kartuRingkasan(): Promise<KartuRingkasan> {
  const db = getPrisma();
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
      _count: { _all: true },
    }),
  ]);

  const omzet = Number(hariIni._sum.total ?? 0n);
  const hpp = Number(hariIni._sum.hppTotal ?? 0n);

  return {
    saldoKas: Number(kas),
    nilaiStok: Number(stok._sum.hppSisa ?? 0n),
    totalHutang: Number(hutang._sum.sisaHutang ?? 0n),
    totalPiutang: Number(piutang._sum.sisaPiutang ?? 0n),
    pinjamanOwner: Number(pinjaman),
    omzetHariIni: omzet,
    labaKotorHariIni: omzet - hpp,
    jumlahNotaHariIni: hariIni._count._all,
  };
}

// ---------------------------------------------------------------
// Omzet per hari (grafik)
// ---------------------------------------------------------------

export interface OmzetHarian {
  tanggal: string; // YYYY-MM-DD
  omzet: number;
  hpp: number;
  laba: number;
  jumlahNota: number;
}

export async function omzetRentang(dari: Date, sampai: Date): Promise<OmzetHarian[]> {
  const db = getPrisma();

  // Ambil semua transaksi penjualan di rentang tanggal
  const sales = await db.sale.findMany({
    where: { status: "AKTIF", tanggal: { gte: dari, lte: sampai } },
    select: { tanggal: true, total: true, hppTotal: true },
  });

  // Peta data per tanggal WIB
  const peta = new Map<string, { omzet: number; hpp: number; jumlahNota: number }>();
  for (const s of sales) {
    const tgl = hariWIB(s.tanggal);
    const curr = peta.get(tgl) || { omzet: 0, hpp: 0, jumlahNota: 0 };
    curr.omzet += Number(s.total);
    curr.hpp += Number(s.hppTotal);
    curr.jumlahNota += 1;
    peta.set(tgl, curr);
  }

  // Buat array tanggal berurutan dari `dari` sampai `sampai`
  const hasil: OmzetHarian[] = [];
  const cur = new Date(dari.getTime());
  const maxTime = sampai.getTime();

  while (cur.getTime() <= maxTime) {
    const tgl = hariWIB(cur);
    const data = peta.get(tgl) || { omzet: 0, hpp: 0, jumlahNota: 0 };
    hasil.push({
      tanggal: tgl,
      omzet: data.omzet,
      hpp: data.hpp,
      laba: data.omzet - data.hpp,
      jumlahNota: data.jumlahNota,
    });
    // Geser 1 hari
    cur.setDate(cur.getDate() + 1);
  }

  return hasil;
}

// ---------------------------------------------------------------
// Top produk terlaris
// ---------------------------------------------------------------

export interface ProdukTerlaris {
  productId: string;
  nama: string;
  merek: string;
  qtyTerjual: number;
  omzet: number;
}

export async function produkTerlarisRentang(
  dari: Date,
  sampai: Date,
  limit: number
): Promise<ProdukTerlaris[]> {
  const db = getPrisma();

  const items = await db.saleItem.groupBy({
    by: ["productId"],
    where: {
      sale: { status: "AKTIF", tanggal: { gte: dari, lte: sampai } },
    },
    _sum: { qty: true, subtotal: true },
    orderBy: { _sum: { subtotal: "desc" } },
    take: limit,
  });

  const produkIds = items.map((it) => it.productId);
  const produkMap = new Map(
    (
      await db.product.findMany({
        where: { id: { in: produkIds } },
        select: { id: true, nama: true, merek: true },
      })
    ).map((p) => [p.id, p])
  );

  return items.map((it) => {
    const p = produkMap.get(it.productId);
    return {
      productId: it.productId,
      nama: p?.nama ?? "-",
      merek: p?.merek ?? "-",
      qtyTerjual: it._sum.qty ?? 0,
      omzet: Number(it._sum.subtotal ?? 0n),
    };
  });
}

// ---------------------------------------------------------------
// Produk stok menipis
// ---------------------------------------------------------------

export interface ProdukStokRendah {
  productId: string;
  nama: string;
  merek: string;
  qtySisa: number;
  satuanDasar: string;
}

export async function produkStokRendah(limit: number): Promise<ProdukStokRendah[]> {
  const db = getPrisma();

  // Ambil semua produk aktif beserta stok lot
  const produk = await db.product.findMany({
    where: { aktif: true },
    select: {
      id: true,
      nama: true,
      merek: true,
      satuanDasar: true,
    },
    orderBy: [{ nama: "asc" }],
  });

  const agg = await db.stockLot.groupBy({
    by: ["productId"],
    where: { aktif: true },
    _sum: { qtySisa: true },
  });

  const petaStok = new Map(agg.map((a) => [a.productId, a._sum.qtySisa ?? 0]));

  // Semua produk dengan stoknya, urutkan dari yang paling rendah
  const denganStok = produk
    .map((p) => ({
      productId: p.id,
      nama: p.nama,
      merek: p.merek,
      qtySisa: petaStok.get(p.id) ?? 0,
      satuanDasar: p.satuanDasar,
    }))
    .sort((a, b) => a.qtySisa - b.qtySisa)
    .slice(0, limit);

  return denganStok;
}

// ---------------------------------------------------------------
// Aktivitas terakhir
// ---------------------------------------------------------------

export interface Aktivitas {
  id: string;
  tipe: "JUAL" | "BELI";
  nomor: string;
  tanggal: string;
  total: number;
  pihak: string;
}

export async function aktivitasTerakhir(limit: number): Promise<Aktivitas[]> {
  const db = getPrisma();

  const [penjualan, pembelian] = await Promise.all([
    db.sale.findMany({
      where: { status: "AKTIF" },
      orderBy: { tanggal: "desc" },
      take: limit,
      select: {
        id: true,
        nomor: true,
        tanggal: true,
        total: true,
        customer: { select: { nama: true } },
      },
    }),
    db.purchase.findMany({
      where: { status: "AKTIF" },
      orderBy: { tanggal: "desc" },
      take: limit,
      select: {
        id: true,
        nomor: true,
        tanggal: true,
        total: true,
        vendor: { select: { nama: true } },
      },
    }),
  ]);

  const gabungan: Aktivitas[] = [
    ...penjualan.map((s) => ({
      id: s.id,
      tipe: "JUAL" as const,
      nomor: s.nomor,
      tanggal: s.tanggal.toISOString(),
      total: Number(s.total),
      pihak: s.customer.nama,
    })),
    ...pembelian.map((p) => ({
      id: p.id,
      tipe: "BELI" as const,
      nomor: p.nomor,
      tanggal: p.tanggal.toISOString(),
      total: Number(p.total),
      pihak: p.vendor.nama,
    })),
  ];

  gabungan.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  return gabungan.slice(0, limit);
}

// ---------------------------------------------------------------
// Hutang/piutang segera (jatuh tempo ≤ N hari)
// ---------------------------------------------------------------

export interface NotaSegera {
  id: string;
  tipe: "HUTANG" | "PIUTANG";
  nomor: string;
  pihak: string;
  sisa: number;
  jatuhTempo: string | null;
  hariLewat: number; // positif = sudah lewat
}

export async function hutangPiutangSegera(batasHari: number): Promise<NotaSegera[]> {
  const db = getPrisma();
  const batas = new Date(Date.now() + batasHari * 24 * 60 * 60 * 1000);

  const [hutang, piutang] = await Promise.all([
    db.purchase.findMany({
      where: {
        status: "AKTIF",
        cara: "CREDIT",
        sisaHutang: { gt: 0 },
        jatuhTempo: { lte: batas },
      },
      orderBy: { jatuhTempo: "asc" },
      take: 10,
      select: {
        id: true,
        nomor: true,
        sisaHutang: true,
        jatuhTempo: true,
        vendor: { select: { nama: true } },
      },
    }),
    db.sale.findMany({
      where: {
        status: "AKTIF",
        cara: "CREDIT",
        sisaPiutang: { gt: 0 },
        jatuhTempo: { lte: batas },
      },
      orderBy: { jatuhTempo: "asc" },
      take: 10,
      select: {
        id: true,
        nomor: true,
        sisaPiutang: true,
        jatuhTempo: true,
        customer: { select: { nama: true } },
      },
    }),
  ]);

  const MS_HARI = 24 * 60 * 60 * 1000;
  const sekarang = Date.now();

  const gabungan: NotaSegera[] = [
    ...hutang.map((h) => ({
      id: h.id,
      tipe: "HUTANG" as const,
      nomor: h.nomor,
      pihak: h.vendor.nama,
      sisa: Number(h.sisaHutang),
      jatuhTempo: h.jatuhTempo?.toISOString() ?? null,
      hariLewat: h.jatuhTempo
        ? Math.floor((sekarang - h.jatuhTempo.getTime()) / MS_HARI)
        : 0,
    })),
    ...piutang.map((p) => ({
      id: p.id,
      tipe: "PIUTANG" as const,
      nomor: p.nomor,
      pihak: p.customer.nama,
      sisa: Number(p.sisaPiutang),
      jatuhTempo: p.jatuhTempo?.toISOString() ?? null,
      hariLewat: p.jatuhTempo
        ? Math.floor((sekarang - p.jatuhTempo.getTime()) / MS_HARI)
        : 0,
    })),
  ];

  // Urutkan: yang paling terlambat di atas
  gabungan.sort((a, b) => b.hariLewat - a.hariLewat);

  return gabungan;
}
