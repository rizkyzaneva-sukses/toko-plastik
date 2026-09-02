/**
 * Vendor & customer — PRD pasal 5: "Data minimum. UMUM untuk cash retail."
 * Baca: owner + kasir. Tulis: owner saja.
 */

import { getPrisma } from "@/lib/prisma";
import { withAuth, withOwner, ok, AturanBisnisError } from "@/lib/api-helpers";
import { catatAuditLepas } from "@/lib/audit";

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const tipe = url.searchParams.get("tipe");
  const semua = url.searchParams.get("semua") === "1";

  if (tipe && tipe !== "VENDOR" && tipe !== "CUSTOMER") {
    throw new AturanBisnisError("Tipe pihak tidak valid");
  }

  const pihak = await getPrisma().party.findMany({
    where: {
      ...(tipe ? { tipe: tipe as "VENDOR" | "CUSTOMER" } : {}),
      ...(semua ? {} : { aktif: true }),
    },
    // UMUM selalu di atas supaya kasir bisa langsung pakai.
    orderBy: [{ isSystem: "desc" }, { nama: "asc" }],
  });

  return ok({ pihak });
});

export const POST = withOwner(async (req, user) => {
  const b = await req.json();
  const nama = b.nama?.trim();
  if (!nama) throw new AturanBisnisError("Nama wajib diisi");
  if (b.tipe !== "VENDOR" && b.tipe !== "CUSTOMER") {
    throw new AturanBisnisError("Tipe harus VENDOR atau CUSTOMER");
  }

  const db = getPrisma();
  const kembar = await db.party.findFirst({ where: { tipe: b.tipe, nama } });
  if (kembar) throw new AturanBisnisError(`${b.tipe === "VENDOR" ? "Vendor" : "Customer"} "${nama}" sudah ada.`);

  const pihak = await db.party.create({
    data: {
      tipe: b.tipe,
      nama,
      telepon: b.telepon?.trim() || null,
      alamat: b.alamat?.trim() || null,
      catatan: b.catatan?.trim() || null,
    },
  });

  await catatAuditLepas({
    userId: user.id,
    aksi: "CREATE",
    entitas: "Party",
    entitasId: pihak.id,
    after: pihak,
    keterangan: `Tambah ${b.tipe.toLowerCase()} ${nama}`,
  });

  return ok({ pihak }, 201);
});
