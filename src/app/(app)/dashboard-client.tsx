/**
 * Dashboard client component — fetches data via React Query dan renders
 * semua widget dashboard: kartu, grafik, tabel, dll.
 *
 * PRD pasal 10: PERINGATAN_LABA wajib ditampilkan.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  TrendingUp,
  BarChart3,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  Store,
  HandCoins,
  RefreshCw,
  Calendar,
  Clock,
} from "lucide-react";
import {
  Card,
  CardJudul,
  Tombol,
  Peringatan,
  SkeletonTabel,
  Galat,
  Tabel,
  Th,
  Td,
  Badge,
} from "@/components/ui/dasar";
import { ChartBar } from "@/components/ui/chart-bar";
import { fetchJson, formatRupiah, formatTanggal, formatAngka, tanggalWIB } from "@/lib/utils";
import type {
  KartuRingkasan,
  OmzetHarian,
  ProdukTerlaris,
  ProdukStokRendah,
  Aktivitas,
  NotaSegera,
} from "@/lib/dashboard";

interface DashboardData {
  ringkasan: KartuRingkasan;
  grafik: OmzetHarian[];
  terlaris: ProdukTerlaris[];
  stokRendah: ProdukStokRendah[];
  aktivitas: Aktivitas[];
  segera: NotaSegera[];
  rentang: {
    dari: string;
    sampai: string;
  };
}

type ModeFilter = "7hari" | "30hari" | "bulanIni" | "bulanLalu" | "kustom";

export function DashboardClient() {
  const [mode, setMode] = React.useState<ModeFilter>("7hari");

  // Helper tanggal awal/akhir bulan ini / bulan lalu
  const hitungRentang = React.useCallback((pilihan: ModeFilter): { dari: string; sampai: string } => {
    const today = new Date();
    const sampaiStr = tanggalWIB(today);

    if (pilihan === "7hari") {
      const d = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      return { dari: tanggalWIB(d), sampai: sampaiStr };
    }
    if (pilihan === "30hari") {
      const d = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
      return { dari: tanggalWIB(d), sampai: sampaiStr };
    }
    if (pilihan === "bulanIni") {
      // Tanggal 1 bulan ini sampai hari ini
      const thn = today.getFullYear();
      const bln = String(today.getMonth() + 1).padStart(2, "0");
      return { dari: `${thn}-${bln}-01`, sampai: sampaiStr };
    }
    if (pilihan === "bulanLalu") {
      const blnLalu = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const akhirBlnLalu = new Date(today.getFullYear(), today.getMonth(), 0);
      return { dari: tanggalWIB(blnLalu), sampai: tanggalWIB(akhirBlnLalu) };
    }
    return { dari: tanggalWIB(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)), sampai: sampaiStr };
  }, []);

  const [tglDari, setTglDari] = React.useState(() => hitungRentang("7hari").dari);
  const [tglSampai, setTglSampai] = React.useState(() => hitungRentang("7hari").sampai);

  const handlePilihMode = (m: ModeFilter) => {
    setMode(m);
    if (m !== "kustom") {
      const r = hitungRentang(m);
      setTglDari(r.dari);
      setTglSampai(r.sampai);
    }
  };

  const q = useQuery({
    queryKey: ["dashboard", tglDari, tglSampai],
    queryFn: () => fetchJson<DashboardData>(`/api/dashboard?dari=${tglDari}&sampai=${tglSampai}`),
    refetchInterval: 60_000, // auto refresh tiap 1 menit
  });

  if (q.isError) {
    return <Galat pesan={q.error.message} onCoba={() => q.refetch()} />;
  }

  const r = q.data?.ringkasan;
  const grafik = q.data?.grafik ?? [];
  const terlaris = q.data?.terlaris ?? [];
  const stokRendah = q.data?.stokRendah ?? [];
  const aktivitas = q.data?.aktivitas ?? [];
  const segera = q.data?.segera ?? [];

  return (
    <div className="space-y-6">
      {/* Header & Filter Periode */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            Ringkasan menyeluruh operasional, performa penjualan & stok
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick preset buttons */}
          <div className="flex rounded-lg border border-gray-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
            {(
              [
                { key: "7hari", label: "7 Hari" },
                { key: "30hari", label: "30 Hari" },
                { key: "bulanIni", label: "Bulan Ini" },
                { key: "bulanLalu", label: "Bulan Lalu" },
                { key: "kustom", label: "Kustom" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => handlePilihMode(item.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  mode === item.key
                    ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Tombol
            varian="hantu"
            onClick={() => q.refetch()}
            memuat={q.isFetching}
            title="Muat ulang data"
          >
            <RefreshCw className="h-4 w-4" />
          </Tombol>
        </div>
      </div>

      {/* Input Tanggal Kustom (tampil bila mode kustom) */}
      {mode === "kustom" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Dari:</span>
          <input
            type="date"
            value={tglDari}
            onChange={(e) => setTglDari(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-gray-100"
          />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Sampai:</span>
          <input
            type="date"
            value={tglSampai}
            onChange={(e) => setTglSampai(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-gray-100"
          />
        </div>
      )}

      {/* Kartu ringkasan */}
      {q.isLoading ? (
        <SkeletonTabel baris={2} />
      ) : r ? (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <KartuAngka
              ikon={<Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              label="Saldo Kas"
              nilai={r.saldoKas}
            />
            <KartuAngka
              ikon={<TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
              label="Omzet Hari Ini"
              nilai={r.omzetHariIni}
              keterangan={`${r.jumlahNotaHariIni} nota hari ini`}
            />
            <KartuAngka
              ikon={<BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" />}
              label="Laba Kotor Hari Ini"
              nilai={r.labaKotorHariIni}
            />
            <KartuAngka
              ikon={<Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
              label="Nilai Stok (HPP)"
              nilai={r.nilaiStok}
            />
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            <KartuAngka
              ikon={<ArrowDownLeft className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
              label="Piutang Customer"
              nilai={r.totalPiutang}
              nada={r.totalPiutang > 0 ? "waspada" : undefined}
            />
            <KartuAngka
              ikon={<ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />}
              label="Hutang Vendor"
              nilai={r.totalHutang}
              nada={r.totalHutang > 0 ? "waspada" : undefined}
            />
            <KartuAngka
              ikon={<HandCoins className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
              label="Pinjaman Owner"
              nilai={r.pinjamanOwner}
              nada={r.pinjamanOwner > 0 ? "waspada" : undefined}
            />
          </div>
        </>
      ) : null}

      {/* Peringatan kas — PRD pasal 10, WAJIB */}
      <Peringatan judul="Laba bukan izin menarik uang">
        Laba kotor bisa lebih besar dari kas karena sebagian sudah berubah menjadi stok dan
        piutang. Yang boleh diambil dibatasi saldo kas, dan setiap penarikan tercatat sebagai
        pinjaman owner.
      </Peringatan>

      {/* Grafik omzet & laba harian */}
      <Card>
        <CardJudul
          judul={`Grafik Omzet & Laba (${formatTanggal(tglDari)} – ${formatTanggal(tglSampai)})`}
          keterangan="Bar biru = Omzet, Bar hijau = Laba kotor (FIFO)"
        />
        {q.isLoading ? (
          <SkeletonTabel baris={3} />
        ) : (
          <ChartBar
            data={grafik.map((g) => ({
              label: g.tanggal.slice(5), // MM-DD
              nilai1: g.omzet,
              nilai2: g.laba,
            }))}
          />
        )}
      </Card>

      {/* Grid 2 kolom: Top 5 Terlaris & Stok Menipis */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Produk terlaris di periode yang dipilih */}
        <Card>
          <CardJudul
            judul="Top 5 Produk Terlaris"
            keterangan={`Berdasarkan omzet (${formatTanggal(tglDari)} – ${formatTanggal(tglSampai)})`}
          />
          {terlaris.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Belum ada penjualan pada periode ini
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Tabel>
                <thead>
                  <tr>
                    <Th>Produk</Th>
                    <Th className="text-right">Qty Terjual</Th>
                    <Th className="text-right">Omzet</Th>
                  </tr>
                </thead>
                <tbody>
                  {terlaris.map((t) => (
                    <tr key={t.productId}>
                      <Td>
                        <span className="font-medium text-gray-900 dark:text-gray-50">
                          {t.nama}
                        </span>
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                          {t.merek}
                        </span>
                      </Td>
                      <Td className="text-right">{formatAngka(t.qtyTerjual)}</Td>
                      <Td className="text-right">{formatRupiah(t.omzet)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Tabel>
            </div>
          )}
        </Card>

        {/* Stok menipis */}
        <Card>
          <CardJudul judul="Peringatan Stok Menipis" keterangan="5 produk dengan sisa stok terendah" />
          {stokRendah.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Semua stok aman
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Tabel>
                <thead>
                  <tr>
                    <Th>Produk</Th>
                    <Th className="text-right">Sisa Stok</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {stokRendah.map((s) => (
                    <tr key={s.productId}>
                      <Td>
                        <span className="font-medium text-gray-900 dark:text-gray-50">
                          {s.nama}
                        </span>
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                          {s.merek}
                        </span>
                      </Td>
                      <Td className="text-right">
                        {formatAngka(s.qtySisa)} {s.satuanDasar.toLowerCase()}
                      </Td>
                      <Td>
                        {s.qtySisa === 0 ? (
                          <Badge nada="bahaya">Habis</Badge>
                        ) : s.qtySisa <= 100 ? (
                          <Badge nada="peringatan">Rendah</Badge>
                        ) : (
                          <Badge nada="sukses">OK</Badge>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tabel>
            </div>
          )}
        </Card>
      </div>

      {/* Grid 2 kolom: Aktivitas Terakhir & Jatuh Tempo Dekat */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Aktivitas terakhir */}
        <Card>
          <CardJudul judul="Aktivitas Transaksi Terakhir" keterangan="5 transaksi jual & beli terbaru" />
          {aktivitas.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Belum ada transaksi
            </p>
          ) : (
            <div className="space-y-3">
              {aktivitas.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-zinc-700"
                >
                  <div
                    className={
                      a.tipe === "JUAL"
                        ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40"
                        : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40"
                    }
                  >
                    {a.tipe === "JUAL" ? (
                      <ShoppingCart className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                    ) : (
                      <Store className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {a.nomor}
                      </span>
                      <Badge nada={a.tipe === "JUAL" ? "info" : "netral"}>
                        {a.tipe === "JUAL" ? "Jual" : "Beli"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {a.pihak} · {formatTanggal(a.tanggal)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {formatRupiah(a.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Hutang & Piutang Segera */}
        <Card>
          <CardJudul
            judul="Hutang / Piutang Jatuh Tempo"
            keterangan="Nota kredit yang jatuh tempo dalam ≤ 3 hari atau sudah lewat"
          />
          {segera.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tidak ada hutang atau piutang yang mendesak
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {segera.map((n) => (
                <div
                  key={`${n.tipe}-${n.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 p-3 dark:border-zinc-700"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                        {n.nomor}
                      </span>
                      <Badge nada={n.tipe === "HUTANG" ? "bahaya" : "peringatan"}>
                        {n.tipe}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {n.pihak}
                      {n.hariLewat > 0 && (
                        <span className="ml-1 font-medium text-red-600 dark:text-red-400">
                          · Lewat {n.hariLewat} hari
                        </span>
                      )}
                      {n.hariLewat === 0 && (
                        <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                          · Hari ini
                        </span>
                      )}
                      {n.hariLewat < 0 && (
                        <span className="ml-1">
                          · {Math.abs(n.hariLewat)} hari lagi
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {formatRupiah(n.sisa)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Pintasan Aksi */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Link href="/kasir">
          <Tombol>
            <ShoppingCart className="h-4 w-4" />
            Buka Layar Kasir
          </Tombol>
        </Link>
        <Link href="/beli">
          <Tombol varian="sekunder">
            <Store className="h-4 w-4" />
            Catat Pembelian
          </Tombol>
        </Link>
        <Link href="/hutang-piutang">
          <Tombol varian="sekunder">
            <HandCoins className="h-4 w-4" />
            Hutang & Piutang
          </Tombol>
        </Link>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Komponen Kartu Angka Ringkasan
// --------------------------------------------------------------------------

function KartuAngka({
  ikon,
  label,
  nilai,
  keterangan,
  nada,
}: {
  ikon: React.ReactNode;
  label: string;
  nilai: number;
  keterangan?: string;
  nada?: "waspada";
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p
            className={
              nada === "waspada" && nilai > 0
                ? "mt-1 text-lg font-bold text-amber-700 dark:text-amber-300 sm:text-xl"
                : "mt-1 text-lg font-bold text-gray-900 dark:text-gray-50 sm:text-xl"
            }
          >
            {formatRupiah(nilai)}
          </p>
          {keterangan && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{keterangan}</p>
          )}
        </div>
        <div className="shrink-0 rounded-lg bg-gray-100 p-2 dark:bg-zinc-700">
          {ikon}
        </div>
      </div>
    </Card>
  );
}
