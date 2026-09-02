/**
 * Audit log — PRD pasal 7: siapa, kapan, apa, nilai lama/baru. Owner only.
 * Isinya tidak bisa diedit maupun dihapus dari UI mana pun.
 */

"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
} from "@/components/ui/dasar";
import { fetchJson, formatTanggalJam } from "@/lib/utils";

interface Log {
  id: string;
  aksi: string;
  entitas: string;
  entitasId: string | null;
  before: unknown;
  after: unknown;
  keterangan: string | null;
  createdAt: string;
  user: { nama: string; username: string; role: string };
}

const ENTITAS = [
  { value: "", label: "Semua entitas" },
  { value: "Sale", label: "Penjualan" },
  { value: "Purchase", label: "Pembelian" },
  { value: "Payment", label: "Pembayaran" },
  { value: "StockAdjustment", label: "Penyesuaian stok" },
  { value: "StockLot", label: "Lot stok" },
  { value: "OwnerLoan", label: "Pinjaman owner" },
  { value: "CashEntry", label: "Kas" },
  { value: "Product", label: "Master barang" },
  { value: "Party", label: "Vendor / Customer" },
  { value: "User", label: "Pengguna" },
];

const NADA_AKSI: Record<string, "sukses" | "bahaya" | "peringatan" | "info" | "netral"> = {
  CREATE: "sukses",
  UPDATE: "info",
  VOID: "bahaya",
  ADJUST: "peringatan",
  OPNAME: "peringatan",
  PAYMENT: "info",
  OWNER_LOAN: "peringatan",
  OPEX: "netral",
  LOGIN: "netral",
};

function ringkasNilai(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return "";
  if (typeof nilai !== "object") return String(nilai);
  return Object.entries(nilai as Record<string, unknown>)
    .filter(([, v]) => v !== null && typeof v !== "object")
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

export function PanelLog() {
  const [entitas, setEntitas] = React.useState<string | null>("");

  const logQ = useQuery({
    queryKey: ["audit", entitas],
    queryFn: () =>
      fetchJson<{ log: Log[] }>(`/api/audit?batas=200${entitas ? `&entitas=${entitas}` : ""}`),
  });

  const log = logQ.data?.log ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Audit Log</h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          Catatan permanen. Tidak bisa diedit atau dihapus dari aplikasi.
        </p>
      </div>

      <Card>
        <CardJudul
          judul="200 catatan terakhir"
          aksi={
            <div className="w-56">
              <SearchableSelect
                value={entitas}
                onChange={setEntitas}
                placeholder="Semua entitas"
                emptyText="Tidak ditemukan"
                options={ENTITAS}
              />
            </div>
          }
        />

        {logQ.isLoading ? (
          <SkeletonTabel />
        ) : logQ.isError ? (
          <Galat pesan={(logQ.error as Error).message} onCoba={() => logQ.refetch()} />
        ) : log.length === 0 ? (
          <Kosong pesan="Belum ada catatan" />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Waktu</Th>
                <Th>Siapa</Th>
                <Th>Aksi</Th>
                <Th>Entitas</Th>
                <Th>Keterangan</Th>
                <Th>Nilai lama &rarr; baru</Th>
              </tr>
            </thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id}>
                  <Td className="whitespace-nowrap text-xs">{formatTanggalJam(l.createdAt)}</Td>
                  <Td className="whitespace-nowrap">
                    <span className="block">{l.user.nama}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {l.user.role}
                    </span>
                  </Td>
                  <Td>
                    <Badge nada={NADA_AKSI[l.aksi] ?? "netral"}>{l.aksi}</Badge>
                  </Td>
                  <Td className="text-xs">{l.entitas}</Td>
                  <Td className="max-w-sm text-xs">{l.keterangan ?? "-"}</Td>
                  <Td className="max-w-md text-xs text-gray-600 dark:text-gray-400">
                    {l.before ? <span className="block">Lama: {ringkasNilai(l.before)}</span> : null}
                    {l.after ? <span className="block">Baru: {ringkasNilai(l.after)}</span> : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        )}
      </Card>
    </div>
  );
}
