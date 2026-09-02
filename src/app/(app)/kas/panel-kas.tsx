/**
 * Kas — PRD pasal 4.4 dan pasal 10.
 * Saldo berjalan + mutasi per tanggal, plus entri biaya operasional.
 * Biaya operasional tidak pernah mengubah HPP (pasal 4.2).
 */

"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Card,
  CardJudul,
  Tombol,
  Input,
  Field,
  Kosong,
  Galat,
  SkeletonTabel,
  Peringatan,
  Tabel,
  Th,
  Td,
  Badge,
} from "@/components/ui/dasar";
import { fetchJson, formatRupiah, formatTanggalJam, tanggalWIB } from "@/lib/utils";

const LABEL_JENIS: Record<string, string> = {
  SALE: "Penjualan cash",
  PURCHASE: "Pembelian cash",
  PAYMENT: "Pelunasan",
  OPEX: "Biaya operasional",
  OWNER_LOAN: "Pinjaman owner",
  OWNER_REPAY: "Pengembalian owner",
  VOID: "Pembatalan nota",
  ADJUST: "Penyesuaian",
  OPENING: "Saldo awal",
};

const KATEGORI_BIAYA = [
  { value: "Ongkir", label: "Ongkir", hint: "Tidak masuk HPP barang" },
  { value: "Kuli", label: "Kuli / bongkar muat", hint: "Tidak masuk HPP barang" },
  { value: "Listrik", label: "Listrik & air" },
  { value: "Sewa", label: "Sewa tempat" },
  { value: "Transport", label: "Transport" },
  { value: "Lain-lain", label: "Lain-lain" },
];

interface Entri {
  id: string;
  jenis: string;
  arah: "MASUK" | "KELUAR";
  nominal: number;
  tanggal: string;
  keterangan: string;
  kategori: string | null;
  createdBy: { nama: string };
}

export function PanelKas() {
  const qc = useQueryClient();
  const [dari, setDari] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return tanggalWIB(d);
  });
  const [sampai, setSampai] = React.useState(() => tanggalWIB());

  const kasQ = useQuery({
    queryKey: ["kas", dari, sampai],
    queryFn: () =>
      fetchJson<{ entri: Entri[]; saldoAwal: number; saldoSekarang: number }>(
        `/api/kas?dari=${dari}&sampai=${sampai}`
      ),
  });

  const awalQ = useQuery({
    queryKey: ["saldo-awal"],
    queryFn: () => fetchJson<{ sudahDiisi: boolean }>("/api/kas/saldo-awal"),
  });

  const [nominal, setNominal] = React.useState("");
  const [kategori, setKategori] = React.useState<string | null>("Ongkir");
  const [keterangan, setKeterangan] = React.useState("");

  const simpanBiaya = useMutation({
    mutationFn: () =>
      fetchJson("/api/kas/biaya", {
        method: "POST",
        body: JSON.stringify({ nominal: Number(nominal), kategori, keterangan }),
      }),
    onSuccess: () => {
      toast.success("Biaya tercatat. Kas berkurang, HPP tidak berubah.");
      setNominal("");
      setKeterangan("");
      qc.invalidateQueries({ queryKey: ["kas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [saldoAwal, setSaldoAwal] = React.useState("");
  const simpanSaldoAwal = useMutation({
    mutationFn: () =>
      fetchJson("/api/kas/saldo-awal", {
        method: "POST",
        body: JSON.stringify({ nominal: Number(saldoAwal) }),
      }),
    onSuccess: () => {
      toast.success("Saldo kas awal tercatat");
      setSaldoAwal("");
      qc.invalidateQueries({ queryKey: ["kas"] });
      awalQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const entri = kasQ.data?.entri ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Kas</h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          Kas hanya bergerak kalau uang benar-benar pindah.
        </p>
      </div>

      <Card>
        <p className="text-sm text-gray-600 dark:text-gray-400">Saldo kas sekarang</p>
        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-50">
          {formatRupiah(kasQ.data?.saldoSekarang ?? 0)}
        </p>
      </Card>

      {awalQ.data && !awalQ.data.sudahDiisi && (
        <Card>
          <CardJudul
            judul="Saldo kas awal belum diisi"
            keterangan="Hitung uang fisik di laci saat go-live, lalu masukkan di sini. Hanya bisa sekali."
          />
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
              <Field label="Uang fisik di laci" wajib>
                <Input
                  inputMode="numeric"
                  value={saldoAwal}
                  onChange={(e) => setSaldoAwal(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
            <Tombol
              onClick={() => simpanSaldoAwal.mutate()}
              memuat={simpanSaldoAwal.isPending}
              disabled={!saldoAwal}
            >
              <Wallet className="h-4 w-4" />
              Simpan saldo awal
            </Tombol>
          </div>
        </Card>
      )}

      <Card>
        <CardJudul judul="Catat biaya operasional" />
        <div className="space-y-3">
          <Peringatan nada="info">
            Ongkir, kuli, dan biaya lain masuk ke sini &mdash; bukan ke harga beli barang. HPP lot
            tidak berubah karenanya.
          </Peringatan>

          <div className="grid gap-3 sm:grid-cols-2">
            <SearchableSelect
              label="Kategori"
              required
              value={kategori}
              onChange={setKategori}
              placeholder="Pilih kategori"
              emptyText="Tidak ditemukan"
              options={KATEGORI_BIAYA}
            />
            <Field label="Nominal" wajib>
              <Input
                inputMode="numeric"
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          <Field label="Keterangan" wajib>
            <Input
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: ongkir kirim gula dari vendor"
            />
          </Field>

          <Tombol
            onClick={() => simpanBiaya.mutate()}
            memuat={simpanBiaya.isPending}
            disabled={!nominal || !keterangan || !kategori}
          >
            <Plus className="h-4 w-4" />
            Catat biaya
          </Tombol>
        </div>
      </Card>

      <Card>
        <CardJudul
          judul="Mutasi kas"
          aksi={
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
          }
        />

        {kasQ.isLoading ? (
          <SkeletonTabel />
        ) : kasQ.isError ? (
          <Galat pesan={(kasQ.error as Error).message} onCoba={() => kasQ.refetch()} />
        ) : entri.length === 0 ? (
          <Kosong pesan="Tidak ada mutasi di rentang ini" />
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Saldo sebelum {dari}:{" "}
              <span className="font-semibold text-gray-900 dark:text-gray-50">
                {formatRupiah(kasQ.data?.saldoAwal ?? 0)}
              </span>
            </p>
            <Tabel>
              <thead>
                <tr>
                  <Th>Waktu</Th>
                  <Th>Jenis</Th>
                  <Th>Keterangan</Th>
                  <Th>Oleh</Th>
                  <Th className="text-right">Masuk</Th>
                  <Th className="text-right">Keluar</Th>
                </tr>
              </thead>
              <tbody>
                {entri.map((e) => (
                  <tr key={e.id}>
                    <Td className="whitespace-nowrap text-xs">{formatTanggalJam(e.tanggal)}</Td>
                    <Td>
                      <Badge nada={e.arah === "MASUK" ? "sukses" : "netral"}>
                        {LABEL_JENIS[e.jenis] ?? e.jenis}
                      </Badge>
                    </Td>
                    <Td className="max-w-xs">
                      <span className="block truncate">{e.keterangan}</span>
                      {e.kategori && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {e.kategori}
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-xs">{e.createdBy.nama}</Td>
                    <Td className="text-right tabular-nums text-green-700 dark:text-green-300">
                      {e.arah === "MASUK" && (
                        <span className="inline-flex items-center gap-1">
                          <ArrowDownRight className="h-3.5 w-3.5" />
                          {formatRupiah(e.nominal)}
                        </span>
                      )}
                    </Td>
                    <Td className="text-right tabular-nums text-red-700 dark:text-red-300">
                      {e.arah === "KELUAR" && (
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          {formatRupiah(e.nominal)}
                        </span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabel>
          </>
        )}
      </Card>
    </div>
  );
}
