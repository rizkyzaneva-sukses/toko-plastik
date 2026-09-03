/**
 * Dialog Import Produk dari file Excel (.xlsx, .xls) atau CSV.
 */

"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Tombol, Peringatan } from "@/components/ui/dasar";
import { toast } from "sonner";

interface Props {
  buka: boolean;
  onTutup: () => void;
  onSukses: () => void;
}

interface HasilImport {
  berhasil: number;
  duplikat: number;
  gagal: { baris: number; pesan: string }[];
}

export function DialogImportProduk({ buka, onTutup, onSukses }: Props) {
  const [file, setFile] = React.useState<File | null>(null);
  const [memuat, setMemuat] = React.useState(false);
  const [hasil, setHasil] = React.useState<HasilImport | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (buka) {
      setFile(null);
      setHasil(null);
      setMemuat(false);
    }
  }, [buka]);

  async function handleUpload() {
    if (!file) {
      toast.error("Pilih file Excel (.xlsx) atau CSV terlebih dahulu");
      return;
    }

    setMemuat(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/produk/import", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `Gagal import (${res.status})`);
      }

      setHasil(data.hasil);
      onSukses();
      toast.success(
        `Import selesai: ${data.hasil.berhasil} berhasil, ${data.hasil.duplikat} duplikat dilewati`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Terjadi kesalahan saat import");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <Dialog.Root open={buka} onOpenChange={(v) => !v && onTutup()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Import Data Produk
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Upload file Excel (.xlsx, .xls) atau CSV untuk menambahkan banyak produk sekaligus.
          </Dialog.Description>

          {!hasil ? (
            <div className="mt-4 space-y-4">
              {/* Petunjuk kolom */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                <div className="flex items-center justify-between mb-1.5 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Format Kolom Template:
                  </span>
                  <a
                    href="/api/produk/export?format=xlsx"
                    download="template_produk.xlsx"
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline dark:text-blue-300"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh Template Excel
                  </a>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
                  <code>nama</code>, <code>merek</code>, <code>kategori</code>,{" "}
                  <code>satuanDasar</code> (GRAM/IKET/PCS), <code>namaSatuanBeli</code> (karung/dus/iket/pcs),{" "}
                  <code>konversiBeli</code>, <code>hargaJualDefault</code>, <code>hargaJualPerQty</code>.
                </p>
              </div>

              {/* Area File Drop / Input */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-50 dark:border-zinc-600 dark:hover:border-blue-400 dark:hover:bg-zinc-750 transition-colors"
              >
                <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {file ? file.name : "Klik untuk memilih file Excel atau CSV"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Mendukung .xlsx, .xls, atau .csv (Maks. 5 MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Tombol varian="sekunder" onClick={onTutup} disabled={memuat}>
                  Batal
                </Tombol>
                <Tombol onClick={handleUpload} memuat={memuat} disabled={!file || memuat}>
                  <Upload className="h-4 w-4" />
                  Mulai Import
                </Tombol>
              </div>
            </div>
          ) : (
            /* Tampilan Ringkasan Hasil Import */
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-green-50 p-2.5 dark:bg-green-950/40 border border-green-200 dark:border-green-800">
                  <span className="block text-lg font-bold text-green-700 dark:text-green-300">
                    {hasil.berhasil}
                  </span>
                  <span className="text-green-800 dark:text-green-400">Berhasil ditambahkan</span>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="block text-lg font-bold text-amber-700 dark:text-amber-300">
                    {hasil.duplikat}
                  </span>
                  <span className="text-amber-800 dark:text-amber-400">Duplikat dilewati</span>
                </div>
                <div className="rounded-lg bg-red-50 p-2.5 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
                  <span className="block text-lg font-bold text-red-700 dark:text-red-300">
                    {hasil.gagal.length}
                  </span>
                  <span className="text-red-800 dark:text-red-400">Gagal / error</span>
                </div>
              </div>

              {hasil.gagal.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50/50 p-2 text-xs dark:border-red-900 dark:bg-red-950/30">
                  <p className="font-semibold text-red-800 dark:text-red-300 mb-1">
                    Detail Baris Gagal:
                  </p>
                  <ul className="space-y-1 text-red-700 dark:text-red-400">
                    {hasil.gagal.map((g, idx) => (
                      <li key={idx}>
                        • Baris {g.baris}: {g.pesan}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Tombol onClick={onTutup}>
                  Selesai
                </Tombol>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
