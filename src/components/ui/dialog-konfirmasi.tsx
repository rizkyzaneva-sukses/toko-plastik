/**
 * Dialog konfirmasi. Dipakai untuk void, nonaktifkan, dan tindakan yang tidak
 * bisa ditarik kembali. Tidak pernah pakai alert()/confirm() bawaan browser.
 *
 * PRD pasal 4.3: void wajib beralasan, jadi dialog ini bisa memaksa isian alasan.
 */

"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Tombol, TextArea, Field } from "@/components/ui/dasar";

interface Props {
  buka: boolean;
  onTutup: () => void;
  judul: string;
  keterangan?: React.ReactNode;
  labelKonfirmasi?: string;
  varian?: "primer" | "bahaya";
  /** Kalau true, alasan wajib diisi sebelum tombol konfirmasi aktif. */
  butuhAlasan?: boolean;
  labelAlasan?: string;
  onKonfirmasi: (alasan: string) => Promise<void> | void;
}

export function DialogKonfirmasi({
  buka,
  onTutup,
  judul,
  keterangan,
  labelKonfirmasi = "Konfirmasi",
  varian = "primer",
  butuhAlasan,
  labelAlasan = "Alasan",
  onKonfirmasi,
}: Props) {
  const [alasan, setAlasan] = React.useState("");
  const [memuat, setMemuat] = React.useState(false);

  React.useEffect(() => {
    if (buka) {
      setAlasan("");
      setMemuat(false);
    }
  }, [buka]);

  const alasanKurang = butuhAlasan && alasan.trim().length < 4;

  async function jalankan() {
    if (alasanKurang) return;
    setMemuat(true);
    try {
      await onKonfirmasi(alasan.trim());
    } finally {
      setMemuat(false);
    }
  }

  return (
    <Dialog.Root open={buka} onOpenChange={(o) => !o && onTutup()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2
                     -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-5 shadow-xl
                     dark:border-zinc-700 dark:bg-zinc-800"
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {judul}
            </Dialog.Title>
            <Dialog.Close
              className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-700"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {keterangan && (
            <Dialog.Description asChild>
              <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">{keterangan}</div>
            </Dialog.Description>
          )}

          {butuhAlasan && (
            <div className="mb-4">
              <Field
                label={labelAlasan}
                wajib
                bantuan="Minimal 4 karakter. Alasan ini tersimpan di audit log dan tidak bisa dihapus."
              >
                <TextArea
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Tulis alasan yang bisa dibaca ulang bulan depan"
                  autoFocus
                />
              </Field>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Tombol varian="sekunder" onClick={onTutup} disabled={memuat}>
              Batal
            </Tombol>
            <Tombol varian={varian} onClick={jalankan} memuat={memuat} disabled={alasanKurang}>
              {labelKonfirmasi}
            </Tombol>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
