/**
 * Pinjaman owner — PRD pasal 4.4 dan 6.4.
 *
 * "Owner tidak bergaji di sistem. Jatah 50% margin di versi awal dibatalkan."
 * Layar ini sengaja tidak menampilkan laba sama sekali, supaya penarikan uang
 * tidak pernah dibaca sebagai "mengambil bagian laba".
 */

"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PiggyBank } from "lucide-react";
import {
  Card,
  CardJudul,
  Tombol,
  Input,
  TextArea,
  Field,
  Kosong,
  SkeletonTabel,
  Peringatan,
  Tabel,
  Th,
  Td,
  Badge,
} from "@/components/ui/dasar";
import { fetchJson, formatRupiah, formatTanggalJam } from "@/lib/utils";

interface Pinjaman {
  id: string;
  arah: "AMBIL" | "KEMBALI";
  nominal: number;
  tanggal: string;
  catatan: string | null;
  createdBy: { nama: string };
}

export function PanelPinjaman() {
  const qc = useQueryClient();
  const [arah, setArah] = React.useState<"AMBIL" | "KEMBALI">("AMBIL");
  const [nominal, setNominal] = React.useState("");
  const [catatan, setCatatan] = React.useState("");

  const pinjamanQ = useQuery({
    queryKey: ["pinjaman"],
    queryFn: () => fetchJson<{ riwayat: Pinjaman[]; saldo: number }>("/api/pinjaman"),
  });

  const kasQ = useQuery({
    queryKey: ["kas-saldo"],
    queryFn: () => fetchJson<{ saldoSekarang: number }>("/api/kas"),
  });

  const simpan = useMutation({
    mutationFn: () =>
      fetchJson("/api/pinjaman", {
        method: "POST",
        body: JSON.stringify({ arah, nominal: Number(nominal), catatan }),
      }),
    onSuccess: () => {
      toast.success(
        arah === "AMBIL" ? "Pengambilan tercatat sebagai pinjaman owner" : "Pengembalian tercatat"
      );
      setNominal("");
      setCatatan("");
      qc.invalidateQueries({ queryKey: ["pinjaman"] });
      qc.invalidateQueries({ queryKey: ["kas-saldo"] });
      qc.invalidateQueries({ queryKey: ["kas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saldoKas = kasQ.data?.saldoSekarang ?? 0;
  const nominalAngka = Number(nominal) || 0;
  const lebihDariKas = arah === "AMBIL" && nominalAngka > saldoKas;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Pinjaman Owner</h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          Uang yang diambil owner dicatat sebagai utang ke toko, bukan pembagian laba.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">Saldo utang owner</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
            {formatRupiah(pinjamanQ.data?.saldo ?? 0)}
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Yang belum dikembalikan ke toko.
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 dark:text-gray-400">Saldo kas toko</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {formatRupiah(saldoKas)}
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Batas nyata yang bisa diambil.
          </p>
        </Card>
      </div>

      <Card>
        <CardJudul judul="Catat pergerakan" />

        <div className="space-y-3">
          <div className="flex gap-2">
            {(["AMBIL", "KEMBALI"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setArah(a)}
                aria-pressed={arah === a}
                className={
                  arah === a
                    ? "min-h-11 flex-1 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white dark:bg-blue-500"
                    : "min-h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-gray-50 dark:hover:bg-zinc-700"
                }
              >
                {a === "AMBIL" ? "Owner ambil uang" : "Owner kembalikan"}
              </button>
            ))}
          </div>

          <Field label="Nominal" wajib>
            <Input
              inputMode="numeric"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field label="Catatan" bantuan="Opsional, tapi memudahkan waktu ditelusuri nanti.">
            <TextArea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: bayar sekolah anak"
            />
          </Field>

          {lebihDariKas && (
            <Peringatan nada="bahaya" judul="Nominal melebihi kas yang ada">
              Kas cuma {formatRupiah(saldoKas)}. Sistem tetap mencatatnya kalau uangnya memang
              diambil, tapi kas akan minus dan itu tanda ada uang yang tidak tercatat.
            </Peringatan>
          )}

          <Peringatan judul="Ini pinjaman, bukan bagi hasil">
            Sistem tidak memeriksa apakah toko sudah untung. Setiap pengambilan menambah utang
            owner dan mengurangi kas, apa pun angka labanya.
          </Peringatan>

          <Tombol
            onClick={() => simpan.mutate()}
            memuat={simpan.isPending}
            disabled={nominalAngka <= 0}
          >
            <PiggyBank className="h-4 w-4" />
            {arah === "AMBIL" ? "Catat pengambilan" : "Catat pengembalian"}
          </Tombol>
        </div>
      </Card>

      <Card>
        <CardJudul judul="Riwayat" />
        {pinjamanQ.isLoading ? (
          <SkeletonTabel />
        ) : (pinjamanQ.data?.riwayat.length ?? 0) === 0 ? (
          <Kosong pesan="Belum ada pengambilan" />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Waktu</Th>
                <Th>Jenis</Th>
                <Th>Catatan</Th>
                <Th>Oleh</Th>
                <Th className="text-right">Nominal</Th>
              </tr>
            </thead>
            <tbody>
              {pinjamanQ.data?.riwayat.map((p) => (
                <tr key={p.id}>
                  <Td className="whitespace-nowrap text-xs">{formatTanggalJam(p.tanggal)}</Td>
                  <Td>
                    <Badge nada={p.arah === "AMBIL" ? "peringatan" : "sukses"}>
                      {p.arah === "AMBIL" ? "Ambil" : "Kembali"}
                    </Badge>
                  </Td>
                  <Td className="max-w-xs truncate">{p.catatan ?? "-"}</Td>
                  <Td className="whitespace-nowrap text-xs">{p.createdBy.nama}</Td>
                  <Td className="text-right tabular-nums">{formatRupiah(p.nominal)}</Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        )}
      </Card>
    </div>
  );
}
