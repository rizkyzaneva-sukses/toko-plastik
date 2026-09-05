/**
 * Pinjaman owner & biaya operasional — PRD pasal 4.4 dan pasal 6.4.
 *
 * "Owner menarik uang sebagai pinjaman, bukan sebagai laba 50%."
 * "Nominal + catatan. Kas turun. Saldo pinjaman owner naik.
 *  TIDAK ADA cek apakah sudah laba."
 *
 * Jatah 50% margin dari versi awal DIBATALKAN dan tidak boleh diselundupkan
 * ke V1 (pasal 4.4). Tidak ada satu pun perhitungan laba di file ini.
 */

import { getPrisma, type Tx } from "@/lib/prisma";
import { AturanBisnisError } from "@/lib/api-helpers";
import { rupiahDariInput } from "@/lib/uang";
import { catatKas, saldoPinjamanOwner } from "@/lib/kas";
import { catatAudit } from "@/lib/audit";

export interface PinjamanInput {
  arah: "AMBIL" | "KEMBALI";
  nominal: number;
  catatan?: string;
}

export async function catatPinjamanOwner(input: PinjamanInput, userId: string) {
  const nominal = rupiahDariInput(input.nominal, "Nominal pinjaman");
  if (nominal <= 0n) throw new AturanBisnisError("Nominal harus lebih dari 0");
  if (input.arah !== "AMBIL" && input.arah !== "KEMBALI") {
    throw new AturanBisnisError("Arah pinjaman tidak valid");
  }

  return getPrisma().$transaction(async (tx) => {
    // Sengaja TIDAK ada pengecekan "apakah sudah laba" (pasal 6.4).
    // Yang dicek hanya hal yang membuat data tidak masuk akal.
    if (input.arah === "KEMBALI") {
      const saldo = await saldoPinjamanOwner(tx);
      if (nominal > saldo) {
        throw new AturanBisnisError(
          `Pengembalian melebihi saldo pinjaman owner (Rp ${saldo.toLocaleString("id-ID")}). ` +
            `Kalau ini setoran modal baru, catat lewat menu Kas, bukan pengembalian pinjaman.`
        );
      }
    }

    const loan = await tx.ownerLoan.create({
      data: {
        arah: input.arah,
        nominal,
        catatan: input.catatan?.trim() || null,
        createdById: userId,
      },
    });

    await catatKas(tx, {
      jenis: input.arah === "AMBIL" ? "OWNER_LOAN" : "OWNER_REPAY",
      arah: input.arah === "AMBIL" ? "KELUAR" : "MASUK",
      nominal,
      keterangan:
        input.arah === "AMBIL"
          ? `Owner mengambil uang (pinjaman)${input.catatan ? ` - ${input.catatan.trim()}` : ""}`
          : `Owner mengembalikan pinjaman${input.catatan ? ` - ${input.catatan.trim()}` : ""}`,
      refTipe: "OWNER_LOAN",
      refId: loan.id,
      userId,
    });

    await catatAudit(tx, {
      userId,
      aksi: "OWNER_LOAN",
      entitas: "OwnerLoan",
      entitasId: loan.id,
      after: { arah: input.arah, nominal },
      keterangan:
        input.arah === "AMBIL"
          ? `Owner ambil pinjaman Rp ${nominal.toLocaleString("id-ID")}`
          : `Owner kembalikan pinjaman Rp ${nominal.toLocaleString("id-ID")}`,
    });

    return loan;
  });
}

export interface BiayaInput {
  nominal: number;
  kategori: string;
  keterangan: string;
  tanggal?: string;
}

/**
 * Biaya operasional — kas keluar, TIDAK mengubah HPP (pasal 4.2 & 4.4).
 * Ongkir, kuli, listrik, dan sejenisnya masuk ke sini, bukan ke lot pembelian.
 */
export async function catatBiaya(input: BiayaInput, userId: string) {
  const nominal = rupiahDariInput(input.nominal, "Nominal biaya");
  if (nominal <= 0n) throw new AturanBisnisError("Nominal biaya harus lebih dari 0");

  const keterangan = input.keterangan?.trim();
  if (!keterangan) throw new AturanBisnisError("Keterangan biaya wajib diisi");

  const kategori = input.kategori?.trim() || "Lain-lain";
  const tanggal = input.tanggal ? new Date(input.tanggal) : new Date();
  if (Number.isNaN(tanggal.getTime())) throw new AturanBisnisError("Tanggal tidak valid");

  return getPrisma().$transaction(async (tx) => {
    const entry = await catatKas(tx, {
      jenis: "OPEX",
      arah: "KELUAR",
      nominal,
      keterangan,
      kategori,
      userId,
      tanggal,
    });

    await catatAudit(tx, {
      userId,
      aksi: "OPEX",
      entitas: "CashEntry",
      entitasId: entry.id,
      after: { nominal, kategori, keterangan },
      keterangan: `Biaya operasional ${kategori}: ${keterangan}`,
    });

    return entry;
  });
}

/** Saldo awal kas fisik di laci saat go-live (PRD pasal 12). Hanya sekali. */
export async function catatSaldoAwalKas(nominalInput: number, userId: string) {
  const nominal = rupiahDariInput(nominalInput, "Saldo awal kas");
  if (nominal <= 0n) throw new AturanBisnisError("Saldo awal harus lebih dari 0");

  return getPrisma().$transaction(async (tx) => {
    const sudahAda = await tx.cashEntry.findFirst({ where: { jenis: "OPENING" } });
    if (sudahAda) {
      throw new AturanBisnisError(
        "Saldo awal kas sudah pernah dicatat. Koreksi lewat entri kas biasa supaya ada jejaknya."
      );
    }

    const entry = await catatKas(tx, {
      jenis: "OPENING",
      arah: "MASUK",
      nominal,
      keterangan: "Saldo kas awal (uang fisik di laci saat go-live)",
      userId,
    });

    await catatAudit(tx, {
      userId,
      aksi: "CREATE",
      entitas: "CashEntry",
      entitasId: entry.id,
      after: { jenis: "OPENING", nominal },
      keterangan: "Saldo kas awal go-live",
    });

    return entry;
  });
}


export interface ModalInput {
  sumber: "PINJAMAN" | "INVESTOR" | "PRIBADI";
  nominal: number;
  keterangan: string;
  tanggal?: string;
}

export async function catatModal(input: ModalInput, userId: string) {
  const nominal = rupiahDariInput(input.nominal, "Nominal modal");
  if (nominal <= 0n) throw new AturanBisnisError("Nominal modal harus lebih dari 0");
  const keterangan = input.keterangan?.trim();
  if (!keterangan) throw new AturanBisnisError("Keterangan wajib diisi");
  if (!["PINJAMAN", "INVESTOR", "PRIBADI"].includes(input.sumber)) {
    throw new AturanBisnisError("Sumber modal tidak valid");
  }
  const tanggal = input.tanggal ? new Date(input.tanggal) : new Date();
  if (Number.isNaN(tanggal.getTime())) throw new AturanBisnisError("Tanggal tidak valid");
  const labelSumber: Record<string, string> = {
    PINJAMAN: "Pinjaman dari pihak lain",
    INVESTOR: "Setoran investor",
    PRIBADI: "Uang pribadi owner",
  };
  return getPrisma().$transaction(async (tx) => {
    const entry = await catatKas(tx, {
      jenis: "SETOR_MODAL", arah: "MASUK", nominal,
      keterangan: `[${labelSumber[input.sumber]}] ${keterangan}`,
      kategori: input.sumber, userId, tanggal,
    });
    await catatAudit(tx, {
      userId, aksi: "SETOR_MODAL", entitas: "CashEntry", entitasId: entry.id,
      after: { nominal, sumber: input.sumber, keterangan },
      keterangan: `Setoran modal ${labelSumber[input.sumber]}: Rp ${nominal.toLocaleString("id-ID")}`,
    });
    return entry;
  });
}

export async function daftarPinjaman(db: Tx | ReturnType<typeof getPrisma> = getPrisma()) {
  return db.ownerLoan.findMany({
    where: { status: "AKTIF" },
    orderBy: { tanggal: "desc" },
    take: 200,
    include: { createdBy: { select: { nama: true } } },
  });
}
