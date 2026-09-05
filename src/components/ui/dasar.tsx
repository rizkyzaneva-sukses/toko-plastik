/**
 * Komponen dasar bersama. Semua warna teks punya pasangan dark: (WCAG AA).
 */

"use client";

import * as React from "react";
import { Loader2, Inbox, AlertTriangle, RefreshCw } from "lucide-react";
import { cn, formatRibuan, hanyaDigit, posisiSetelahDigitKe } from "@/lib/utils";

// --------------------------------------------------------------------------
// Card
// --------------------------------------------------------------------------

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-4 sm:p-6",
        "dark:border-zinc-700 dark:bg-zinc-800",
        className
      )}
      {...props}
    />
  );
}

export function CardJudul({
  judul,
  keterangan,
  aksi,
}: {
  judul: string;
  keterangan?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">{judul}</h2>
        {keterangan && (
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{keterangan}</p>
        )}
      </div>
      {aksi}
    </div>
  );
}

// --------------------------------------------------------------------------
// Tombol
// --------------------------------------------------------------------------

type Varian = "primer" | "sekunder" | "bahaya" | "hantu";

const VARIAN: Record<Varian, string> = {
  primer:
    "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 dark:text-white",
  sekunder:
    "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-gray-50 dark:hover:bg-zinc-700",
  bahaya: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400",
  hantu:
    "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-700",
};

export function Tombol({
  varian = "primer",
  memuat,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { varian?: Varian; memuat?: boolean }) {
  return (
    <button
      // Target sentuh minimal 44px untuk HP.
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2",
        "text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIAN[varian],
        className
      )}
      disabled={props.disabled || memuat}
      {...props}
    >
      {memuat && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// --------------------------------------------------------------------------
// Input
// --------------------------------------------------------------------------

const KELAS_INPUT = cn(
  "w-full rounded-lg border px-3 py-2 text-sm transition-colors",
  "border-gray-300 bg-white text-gray-900 placeholder:text-gray-500",
  "dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-50 dark:placeholder:text-gray-400",
  "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

export function Field({
  label,
  wajib,
  error,
  bantuan,
  children,
}: {
  label: string;
  wajib?: boolean;
  error?: string;
  bantuan?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {wajib && <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>}
      </label>
      {children}
      {bantuan && !error && (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{bantuan}</p>
      )}
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(KELAS_INPUT, className)} {...props} />;
  }
);

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(KELAS_INPUT, "min-h-20", className)} {...props} />;
}

// --------------------------------------------------------------------------
// State halaman: loading / kosong / error
// --------------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-200 dark:bg-zinc-700", className)} />;
}

export function SkeletonTabel({ baris = 5 }: { baris?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: baris }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function Kosong({
  pesan = "Belum ada data",
  keterangan,
  aksi,
}: {
  pesan?: string;
  keterangan?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Inbox className="h-10 w-10 text-gray-500 dark:text-gray-400" />
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-50">{pesan}</p>
        {keterangan && (
          <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">{keterangan}</p>
        )}
      </div>
      {aksi}
    </div>
  );
}

export function Galat({ pesan, onCoba }: { pesan: string; onCoba?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <AlertTriangle className="h-9 w-9 text-red-600 dark:text-red-400" />
      <p className="max-w-md text-sm text-gray-900 dark:text-gray-50">{pesan}</p>
      {onCoba && (
        <Tombol varian="sekunder" onClick={onCoba}>
          <RefreshCw className="h-4 w-4" />
          Coba lagi
        </Tombol>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Badge & peringatan
// --------------------------------------------------------------------------

type NadaBadge = "netral" | "sukses" | "bahaya" | "peringatan" | "info";

const NADA: Record<NadaBadge, string> = {
  netral: "bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-gray-200",
  sukses: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  bahaya: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  peringatan: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  info: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200",
};

export function Badge({
  nada = "netral",
  children,
  className,
}: {
  nada?: NadaBadge;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        NADA[nada],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Kotak peringatan bertulisan — warna bukan satu-satunya penanda. */
export function Peringatan({
  judul,
  children,
  nada = "peringatan",
}: {
  judul?: string;
  children: React.ReactNode;
  nada?: "peringatan" | "info" | "bahaya";
}) {
  const gaya = {
    peringatan:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100",
    info: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100",
    bahaya:
      "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-900/20 dark:text-red-100",
  }[nada];

  return (
    <div className={cn("flex gap-2.5 rounded-lg border p-3 text-sm", gaya)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        {judul && <p className="font-semibold">{judul}</p>}
        <div className={judul ? "mt-0.5" : undefined}>{children}</div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Tabel — selalu bisa di-scroll mendatar di HP
// --------------------------------------------------------------------------

export function Tabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
        <table className="min-w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-gray-200 px-3 py-2 text-left text-xs font-semibold",
        "uppercase tracking-wide text-gray-700 dark:border-zinc-700 dark:text-gray-300",
        className
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "border-b border-gray-100 px-3 py-2.5 text-gray-900 dark:border-zinc-800 dark:text-gray-100",
        className
      )}
      {...props}
    />
  );
}

// AngkaInput / RupiahInput
//
// Input angka bulat yang SELALU tampil dengan pemisah ribuan (1.000.000),
// termasuk saat sedang diketik, supaya jumlah nol gampang dicek sekilas.
// Nilai yang diteruskan ke onChange tetap digit polos ("1000000"), jadi
// pemanggilnya tidak perlu tahu soal format.

interface AngkaInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (v: string) => void;
}

export function AngkaInput({ value, onChange, className, ...props }: AngkaInputProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  const digitSebelumCaret = React.useRef<number | null>(null);
  const tampil = formatRibuan(value);

  // Menambah/menghapus titik menggeser panjang teks, jadi caret harus
  // dikembalikan ke digit yang sama. Tanpa ini, mengetik di tengah angka
  // melempar kursor ke ujung kanan.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || digitSebelumCaret.current === null) return;
    const posisi = posisiSetelahDigitKe(tampil, digitSebelumCaret.current);
    digitSebelumCaret.current = null;
    el.setSelectionRange(posisi, posisi);
  }, [tampil]);

  return (
    <Input
      {...props}
      ref={ref}
      value={tampil}
      inputMode="numeric"
      onKeyDown={(e) => {
        props.onKeyDown?.(e);
        if (e.defaultPrevented) return;
        const el = e.currentTarget;
        const mulai = el.selectionStart ?? 0;
        const akhir = el.selectionEnd ?? 0;
        if (mulai !== akhir) return; // ada teks terblok: biarkan perilaku bawaan

        // Titik ribuan bukan karakter yang berdiri sendiri. Menghapusnya akan
        // langsung dipasang ulang, jadi tombol terasa tidak berfungsi. Yang
        // dimaksud user pasti digit di baliknya.
        if (e.key === "Backspace" && mulai > 0 && el.value[mulai - 1] === ".") {
          e.preventDefault();
          const ke = el.value.slice(0, mulai - 1).replace(/[^0-9]/g, "").length;
          digitSebelumCaret.current = ke - 1;
          onChange(hanyaDigit(value.slice(0, ke - 1) + value.slice(ke)));
        } else if (e.key === "Delete" && el.value[mulai] === ".") {
          e.preventDefault();
          const ke = el.value.slice(0, mulai + 1).replace(/[^0-9]/g, "").length;
          digitSebelumCaret.current = ke;
          onChange(hanyaDigit(value.slice(0, ke) + value.slice(ke + 1)));
        }
      }}
      onChange={(e) => {
        const teks = e.target.value;
        const caret = e.target.selectionStart ?? teks.length;
        digitSebelumCaret.current = teks.slice(0, caret).replace(/[^0-9]/g, "").length;
        onChange(hanyaDigit(teks));
      }}
      className={className}
    />
  );
}

/** Nama khusus untuk nominal rupiah. Perilakunya sama dengan AngkaInput. */
export const RupiahInput = AngkaInput;
