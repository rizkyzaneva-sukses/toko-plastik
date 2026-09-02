/**
 * Audit log — PRD pasal 2.1 dan pasal 7.
 * "Semua perubahan stok, kas, void, dan master barang tercatat di audit log."
 * Hanya owner yang boleh membacanya (PRD A10).
 */

import type { Tx } from "@/lib/prisma";
import { getPrisma } from "@/lib/prisma";

export type AksiAudit =
  | "LOGIN"
  | "CREATE"
  | "UPDATE"
  | "VOID"
  | "ADJUST"
  | "OPNAME"
  | "PAYMENT"
  | "OWNER_LOAN"
  | "OPEX";

interface CatatArgs {
  userId: string;
  aksi: AksiAudit;
  entitas: string;
  entitasId?: string | null;
  before?: unknown;
  after?: unknown;
  keterangan?: string;
}

/** BigInt tidak bisa masuk kolom Json Prisma — ubah dulu jadi number. */
function bersihkan(nilai: unknown): unknown {
  if (nilai === null || nilai === undefined) return null;
  if (typeof nilai === "bigint") return Number(nilai);
  if (nilai instanceof Date) return nilai.toISOString();
  if (Array.isArray(nilai)) return nilai.map(bersihkan);
  if (typeof nilai === "object") {
    return Object.fromEntries(
      Object.entries(nilai as Record<string, unknown>).map(([k, v]) => [k, bersihkan(v)])
    );
  }
  return nilai;
}

/** Dipakai DI DALAM transaksi supaya log ikut batal kalau transaksinya batal. */
export async function catatAudit(tx: Tx, a: CatatArgs) {
  await tx.auditLog.create({
    data: {
      userId: a.userId,
      aksi: a.aksi,
      entitas: a.entitas,
      entitasId: a.entitasId ?? null,
      before: bersihkan(a.before) as never,
      after: bersihkan(a.after) as never,
      keterangan: a.keterangan ?? null,
    },
  });
}

/** Untuk peristiwa di luar transaksi domain (mis. LOGIN). */
export async function catatAuditLepas(a: CatatArgs) {
  await catatAudit(getPrisma() as unknown as Tx, a);
}
