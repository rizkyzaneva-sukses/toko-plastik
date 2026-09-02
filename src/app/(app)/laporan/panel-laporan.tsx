/**
 * Report — PRD pasal 10.
 *
 * Wajib: stok + nilai lot, kas, hutang, piutang, pinjaman owner, laba kotor FIFO.
 * Peringatan "laba kotor boleh lebih besar dari kas" WAJIB muncul di layar laba
 * dan diambil apa adanya dari server (PERINGATAN_LABA).
 */

"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardJudul,
  Input,
  Kosong,
  Galat,
  SkeletonTabel,
  Peringatan,
  Tabel,
  Th,
  Td,
} from "@/components/ui/dasar";
import { fetchJson, formatRupiah, formatPersen, tanggalWIB } from "@/lib/utils";
import { formatQtyPanjang, type SatuanDasar } from "@/lib/satuan";

interface Laba {
  omzet: number;
  hpp: number;
  labaKotor: number;
  jumlahNota: number;
  kerugianStok: number;
  biayaOperasional: number;
}

interface BarisStok {
  productId: string;
  nama: string;
  merek: string;
  satuanDasar: SatuanDasar;
  qty: number;
  nilai: number;
  jumlahLot: number;
}

export function PanelLaporan() {
  const [dari, setDari] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return tanggalWIB(d);
  });
  const [sampai, setSampai] = React.useState(() => tanggalWIB());

  const labaQ = useQuery({
    queryKey: ["laba", dari, sampai],
    queryFn: () =>
      fetchJson<{ laba: Laba; saldoKas: number; peringatan: string }>(
        `/api/laporan/laba?dari=${dari}&sampai=${sampai}`
      ),
  });

  const stokQ = useQuery({
    queryKey: ["laporan-stok"],
    queryFn: () => fetchJson<{ stok: BarisStok[] }>("/api/laporan/stok"),
  });

  const pinjamanQ = useQuery({
    queryKey: ["pinjaman"],
    queryFn: () => fetchJson<{ saldo: number }>("/api/pinjaman"),
  });

  const hutangQ = useQuery({
    queryKey: ["daftar-tagihan", "VENDOR"],
    queryFn: () => fetchJson<{ hutang: { sisaHutang: number }[] }>("/api/laporan/hutang"),
  });

  const piutangQ = useQuery({
    queryKey: ["daftar-tagihan", "CUSTOMER"],
    queryFn: () => fetchJson<{ piutang: { sisaPiutang: number }[] }>("/api/laporan/piutang"),
  });

  const laba = labaQ.data?.laba;
  const stok = stokQ.data?.stok ?? [];
  const nilaiStok = stok.reduce((a, s) => a + s.nilai, 0);
  const totalHutang = (hutangQ.data?.hutang ?? []).reduce((a, h) => a + h.sisaHutang, 0);
  const totalPiutang = (piutangQ.data?.piutang ?? []).reduce((a, p) => a + p.sisaPiutang, 0);
  const margin = laba && laba.omzet > 0 ? laba.labaKotor / laba.omzet : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Report</h1>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            Stok, kas, hutang/piutang, dan laba kotor FIFO.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
            className="w-40"
            aria-label="Tanggal mulai"
          />
          <Input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
            className="w-40"
            aria-label="Tanggal akhir"
          />
        </div>
      </div>

      {labaQ.isError ? (
        <Card>
          <Galat pesan={(labaQ.error as Error).message} onCoba={() => labaQ.refetch()} />
        </Card>
      ) : labaQ.isLoading || !laba ? (
        <Card>
          <SkeletonTabel baris={4} />
        </Card>
      ) : (
        <>
          <Card>
            <CardJudul
              judul="Laba kotor periode"
              keterangan={`${laba.jumlahNota} nota penjualan tidak void.`}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Omzet</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
                  {formatRupiah(laba.omzet)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">HPP FIFO</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
                  {formatRupiah(laba.hpp)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Laba kotor &middot; margin {formatPersen(margin)}
                </p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {formatRupiah(laba.labaKotor)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2 dark:border-zinc-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Kerugian stok (susut / rusak / opname)
                </p>
                <p className="text-lg font-semibold text-red-700 dark:text-red-300">
                  {formatRupiah(laba.kerugianStok)}
                </p>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  Bukan bagian dari omzet. Tidak mengubah HPP lot lain.
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Biaya operasional</p>
                <p className="text-lg font-semibold text-red-700 dark:text-red-300">
                  {formatRupiah(laba.biayaOperasional)}
                </p>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  Ongkir, kuli, listrik. Kas keluar, HPP tidak berubah.
                </p>
              </div>
            </div>

            {/* Kalimat wajib pasal 10 — jangan dihapus. */}
            <div className="mt-4">
              <Peringatan judul="Laba bukan uang yang boleh diambil">
                {labaQ.data?.peringatan}
                <br />
                Saldo kas saat ini:{" "}
                <span className="font-semibold">{formatRupiah(labaQ.data?.saldoKas ?? 0)}</span>.
              </Peringatan>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-sm text-gray-600 dark:text-gray-400">Saldo Kas</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-50">
                {formatRupiah(labaQ.data?.saldoKas ?? 0)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 dark:text-gray-400">Nilai Stok</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-50">
                {formatRupiah(nilaiStok)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 dark:text-gray-400">Hutang / Piutang</p>
              <p className="mt-1 text-sm font-semibold text-red-700 dark:text-red-300">
                Hutang {formatRupiah(totalHutang)}
              </p>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Piutang {formatRupiah(totalPiutang)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pinjaman Owner</p>
              <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">
                {formatRupiah(pinjamanQ.data?.saldo ?? 0)}
              </p>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardJudul
          judul="Stok dan nilainya"
          keterangan="Nilai = jumlah sisa nilai semua lot FIFO barang tersebut."
        />
        {stokQ.isLoading ? (
          <SkeletonTabel />
        ) : stok.length === 0 ? (
          <Kosong pesan="Belum ada barang" />
        ) : (
          <>
            <Tabel>
              <thead>
                <tr>
                  <Th>Barang</Th>
                  <Th className="text-right">Sisa</Th>
                  <Th className="text-right">Lot</Th>
                  <Th className="text-right">Nilai</Th>
                </tr>
              </thead>
              <tbody>
                {stok.map((s) => (
                  <tr key={s.productId}>
                    <Td>
                      {s.nama} {s.merek}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatQtyPanjang(s.qty, s.satuanDasar)}
                    </Td>
                    <Td className="text-right tabular-nums">{s.jumlahLot}</Td>
                    <Td className="text-right tabular-nums">{formatRupiah(s.nilai)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabel>
            <p className="mt-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-50">
              Total nilai stok {formatRupiah(nilaiStok)}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
