/**
 * Riwayat nota jual + void — PRD A11.
 *
 * "Owner void jual cash -> stok kembali, kas kembali, log terisi, nota VOID."
 * Nota tidak pernah dihapus. HPP baris ditampilkan hanya untuk owner.
 */

"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, ChevronDown, ChevronRight } from "lucide-react";
import { DialogKonfirmasi } from "@/components/ui/dialog-konfirmasi";
import {
  Card,
  CardJudul,
  Kosong,
  Galat,
  SkeletonTabel,
  Tabel,
  Th,
  Td,
  Badge,
  Tombol,
} from "@/components/ui/dasar";
import { fetchJson, formatRupiah, formatTanggalJam, labelTempo } from "@/lib/utils";
import { formatQtyPanjang, type SatuanDasar } from "@/lib/satuan";

interface Nota {
  id: string;
  nomor: string;
  tanggal: string;
  cara: "CASH" | "CREDIT";
  status: "AKTIF" | "VOID";
  total: number;
  hppTotal: number;
  sisaPiutang: number;
  jatuhTempo: string | null;
  voidAlasan: string | null;
  customer: { nama: string };
  kasir: { nama: string };
  items: {
    id: string;
    qty: number;
    subtotal: number;
    hpp: number;
    product: { nama: string; merek: string; satuanDasar: SatuanDasar };
  }[];
}

export function PanelNotaJual({ isOwner }: { isOwner: boolean }) {
  const qc = useQueryClient();
  const [buka, setBuka] = React.useState<string | null>(null);
  const [voidId, setVoidId] = React.useState<string | null>(null);
  const [hanyaHariIni, setHanyaHariIni] = React.useState(true);

  const notaQ = useQuery({
    queryKey: ["penjualan", hanyaHariIni],
    queryFn: () =>
      fetchJson<{ nota: Nota[] }>(`/api/penjualan?batas=100${hanyaHariIni ? "&hari_ini=1" : ""}`),
  });

  const batalkan = useMutation({
    mutationFn: ({ id, alasan }: { id: string; alasan: string }) =>
      fetchJson(`/api/penjualan/${id}/void`, {
        method: "POST",
        body: JSON.stringify({ alasan }),
      }),
    onSuccess: () => {
      toast.success("Nota di-void. Stok dikembalikan ke lot semula dan kas dibalik.");
      setVoidId(null);
      qc.invalidateQueries({ queryKey: ["penjualan"] });
      qc.invalidateQueries({ queryKey: ["produk"] });
      qc.invalidateQueries({ queryKey: ["laporan-stok"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setVoidId(null);
    },
  });

  const nota = notaQ.data?.nota ?? [];
  const notaVoid = nota.find((n) => n.id === voidId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Nota Jual</h1>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            Nota tidak pernah dihapus. Koreksi hanya lewat void oleh owner.
          </p>
        </div>
        <Tombol varian="sekunder" onClick={() => setHanyaHariIni((v) => !v)}>
          {hanyaHariIni ? "Tampilkan semua" : "Hari ini saja"}
        </Tombol>
      </div>

      <Card>
        <CardJudul judul={hanyaHariIni ? "Nota hari ini" : "100 nota terakhir"} />

        {notaQ.isLoading ? (
          <SkeletonTabel />
        ) : notaQ.isError ? (
          <Galat pesan={(notaQ.error as Error).message} onCoba={() => notaQ.refetch()} />
        ) : nota.length === 0 ? (
          <Kosong
            pesan={hanyaHariIni ? "Belum ada penjualan hari ini" : "Belum ada penjualan"}
            keterangan="Nota yang tersimpan akan muncul di sini."
          />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th></Th>
                <Th className="hidden sm:table-cell">Waktu</Th>
                <Th>Nomor</Th>
                <Th>Customer</Th>
                <Th>Cara</Th>
                <Th className="text-right">Total</Th>
                {isOwner && <Th className="hidden md:table-cell text-right">Laba kotor</Th>}
                <Th className="hidden sm:table-cell"></Th>
              </tr>
            </thead>
            <tbody>
              {nota.map((n) => (
                <React.Fragment key={n.id}>
                  <tr>
                    <Td>
                      <button
                        onClick={() => setBuka(buka === n.id ? null : n.id)}
                        className="rounded p-1 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-700"
                        aria-label="Lihat rincian"
                      >
                        {buka === n.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </Td>
                    <Td className="hidden sm:table-cell whitespace-nowrap text-xs">{formatTanggalJam(n.tanggal)}</Td>
                    <Td className="whitespace-nowrap font-mono text-xs">{n.nomor}</Td>
                    <Td>
                      <span className="block">{n.customer.nama}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        oleh {n.kasir.nama}
                      </span>
                    </Td>
                    <Td>
                      {n.status === "VOID" ? (
                        <Badge nada="bahaya">VOID</Badge>
                      ) : n.cara === "CASH" ? (
                        <Badge nada="sukses">Cash</Badge>
                      ) : (
                        <Badge nada="peringatan">
                          Kredit &middot; {labelTempo(n.jatuhTempo)}
                        </Badge>
                      )}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatRupiah(n.total)}
                      {n.cara === "CREDIT" && n.status === "AKTIF" && (
                        <span className="block text-xs text-amber-700 dark:text-amber-300">
                          sisa {formatRupiah(n.sisaPiutang)}
                        </span>
                      )}
                    </Td>
                    {isOwner && (
                      <Td className="hidden md:table-cell text-right tabular-nums">
                        {n.status === "VOID" ? "-" : formatRupiah(n.total - n.hppTotal)}
                      </Td>
                    )}
                    <Td className="hidden sm:table-cell">
                      {isOwner && n.status === "AKTIF" && (
                        <button
                          onClick={() => setVoidId(n.id)}
                          className="inline-flex items-center gap-1 text-sm text-red-700 hover:underline dark:text-red-300"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Void
                        </button>
                      )}
                    </Td>
                  </tr>

                  {buka === n.id && (
                    <tr>
                      <Td colSpan={isOwner ? 8 : 7} className="bg-gray-50 dark:bg-zinc-900/60 p-4">
                        <ul className="space-y-1 py-1 text-sm mb-3">
                          {n.items.map((it) => (
                            <li key={it.id} className="flex flex-wrap justify-between gap-2 border-b border-gray-200/50 dark:border-zinc-700/50 pb-1 last:border-0 last:pb-0">
                              <span>
                                {it.product.nama} {it.product.merek} &mdash;{" "}
                                {formatQtyPanjang(it.qty, it.product.satuanDasar)}
                              </span>
                              <span className="tabular-nums">
                                {formatRupiah(it.subtotal)}
                                {isOwner && (
                                  <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                                    HPP {formatRupiah(it.hpp)}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-200 dark:border-zinc-700">
                          <div className="text-xs text-gray-600 dark:text-gray-400 sm:hidden">
                            Waktu: {formatTanggalJam(n.tanggal)}
                            {isOwner && n.status !== "VOID" && (
                               <><br/>Laba Kotor: {formatRupiah(n.total - n.hppTotal)}</>
                            )}
                          </div>
                          
                          {n.status === "VOID" && n.voidAlasan ? (
                            <p className="text-xs text-red-700 dark:text-red-300">
                              Alasan void: {n.voidAlasan}
                            </p>
                          ) : isOwner && n.status === "AKTIF" ? (
                            <button
                              onClick={() => setVoidId(n.id)}
                              className="sm:hidden inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                            >
                              <Ban className="h-4 w-4" />
                              Void Nota Ini
                            </button>
                          ) : <span />}
                        </div>
                      </Td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </Tabel>
        )}
      </Card>

      <DialogKonfirmasi
        buka={Boolean(voidId)}
        onTutup={() => setVoidId(null)}
        judul={`Void nota ${notaVoid?.nomor ?? ""}`}
        varian="bahaya"
        labelKonfirmasi="Void nota"
        butuhAlasan
        labelAlasan="Alasan void"
        keterangan={
          <>
            Stok dikembalikan ke lot semula dan kas dibalik
            {notaVoid?.cara === "CASH" ? " (kas keluar sebesar total nota)" : ""}. Nota tetap ada
            dengan status VOID dan tercatat di audit log.
          </>
        }
        onKonfirmasi={async (alasan) => {
          if (voidId) await batalkan.mutateAsync({ id: voidId, alasan });
        }}
      />
    </div>
  );
}
