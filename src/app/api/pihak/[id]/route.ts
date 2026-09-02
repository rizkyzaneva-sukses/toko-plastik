import { getPrisma } from "@/lib/prisma";
import { withOwner, ok, AturanBisnisError } from "@/lib/api-helpers";
import { catatAuditLepas } from "@/lib/audit";

export const PUT = withOwner(async (req, user, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const db = getPrisma();

  const sebelum = await db.party.findUnique({ where: { id } });
  if (!sebelum) throw new AturanBisnisError("Pihak tidak ditemukan");
  // Record UMUM adalah bagian dari aturan pasal 3 — tidak boleh diubah namanya.
  if (sebelum.isSystem) throw new AturanBisnisError("Record UMUM tidak boleh diubah");

  const b = await req.json();
  const nama = b.nama?.trim();
  if (!nama) throw new AturanBisnisError("Nama wajib diisi");

  const kembar = await db.party.findFirst({
    where: { tipe: sebelum.tipe, nama, NOT: { id } },
  });
  if (kembar) throw new AturanBisnisError(`Nama "${nama}" sudah dipakai.`);

  const sesudah = await db.party.update({
    where: { id },
    data: {
      nama,
      telepon: b.telepon?.trim() || null,
      alamat: b.alamat?.trim() || null,
      catatan: b.catatan?.trim() || null,
    },
  });

  await catatAuditLepas({
    userId: user.id,
    aksi: "UPDATE",
    entitas: "Party",
    entitasId: id,
    before: sebelum,
    after: sesudah,
    keterangan: `Ubah ${sesudah.tipe.toLowerCase()} ${sesudah.nama}`,
  });

  return ok({ pihak: sesudah });
});

/** Soft-nonaktif; hapus fisik dilarang (pasal 7). */
export const DELETE = withOwner(async (_req, user, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const db = getPrisma();

  const pihak = await db.party.findUnique({ where: { id } });
  if (!pihak) throw new AturanBisnisError("Pihak tidak ditemukan");
  if (pihak.isSystem) throw new AturanBisnisError("Record UMUM tidak boleh dinonaktifkan");

  if (pihak.aktif) {
    const [hutang, piutang] = await Promise.all([
      db.purchase.count({ where: { vendorId: id, status: "AKTIF", sisaHutang: { gt: 0 } } }),
      db.sale.count({ where: { customerId: id, status: "AKTIF", sisaPiutang: { gt: 0 } } }),
    ]);
    if (hutang > 0 || piutang > 0) {
      throw new AturanBisnisError(
        "Masih ada nota terbuka untuk pihak ini. Lunasi dulu sebelum dinonaktifkan."
      );
    }
  }

  const sesudah = await db.party.update({ where: { id }, data: { aktif: !pihak.aktif } });

  await catatAuditLepas({
    userId: user.id,
    aksi: "UPDATE",
    entitas: "Party",
    entitasId: id,
    before: { aktif: pihak.aktif },
    after: { aktif: sesudah.aktif },
    keterangan: `${sesudah.aktif ? "Aktifkan" : "Nonaktifkan"} ${pihak.tipe.toLowerCase()} ${pihak.nama}`,
  });

  return ok({ pihak: sesudah });
});
