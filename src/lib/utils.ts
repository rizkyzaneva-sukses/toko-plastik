import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "Asia/Jakarta";

/** Rp 1.250.000 — tanpa desimal (PRD pasal 8). */
export function formatRupiah(nilai: number | string | null | undefined): string {
  const angka = Number(nilai ?? 0);
  if (!Number.isFinite(angka)) return "Rp 0";
  const tanda = angka < 0 ? "-" : "";
  return (
    tanda +
    "Rp " +
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.abs(angka))
  );
}

/** 1.250.000 */
export function formatAngka(nilai: number | string | null | undefined, desimal = 0): string {
  const angka = Number(nilai ?? 0);
  if (!Number.isFinite(angka)) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  }).format(angka);
}

/** 12,3% — input berupa rasio (0.123) */
export function formatPersen(rasio: number, desimal = 1): string {
  if (!Number.isFinite(rasio)) return "-";
  return formatAngka(rasio * 100, desimal) + "%";
}

/** 20 Agu 2026 (WIB) */
export function formatTanggal(tanggal: Date | string | null | undefined): string {
  if (!tanggal) return "-";
  const d = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
}

/** 20 Agu 2026 14:30 (WIB) */
export function formatTanggalJam(tanggal: Date | string | null | undefined): string {
  if (!tanggal) return "-";
  const d = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}

/** 'YYYY-MM-DD' menurut WIB — untuk pengelompokan laporan harian. */
export function tanggalWIB(tanggal: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).format(tanggal);
}

/**
 * Umur hutang/piutang dalam hari terhadap jatuh tempo (PRD pasal 10).
 * Positif = sudah lewat tempo.
 */
export function hariLewatTempo(jatuhTempo: Date | string | null | undefined): number | null {
  if (!jatuhTempo) return null;
  const d = typeof jatuhTempo === "string" ? new Date(jatuhTempo) : jatuhTempo;
  if (Number.isNaN(d.getTime())) return null;
  const MS_HARI = 24 * 60 * 60 * 1000;
  return Math.floor((Date.now() - d.getTime()) / MS_HARI);
}

export function labelTempo(jatuhTempo: Date | string | null | undefined): string {
  const hari = hariLewatTempo(jatuhTempo);
  if (hari === null) return "-";
  if (hari > 0) return `Lewat ${hari} hari`;
  if (hari === 0) return "Jatuh tempo hari ini";
  return `${Math.abs(hari)} hari lagi`;
}

/** Fetcher JSON dengan pesan error yang bisa ditampilkan ke user. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const teks = await res.text();
  const data = teks ? JSON.parse(teks) : null;
  if (!res.ok) {
    throw new Error(data?.error ?? `Gagal memuat data (${res.status})`);
  }
  return data as T;
}
