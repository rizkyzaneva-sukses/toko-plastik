/**
 * Ubah / nonaktifkan master barang — owner saja.
 *
 * PRD pasal 13: "Konversi hanya owner; ubah konversi ber-audit; barang lama
 * tidak dihitung ulang otomatis." Karena itu lot dan nota lama tidak disentuh
 * sama sekali di sini — konversi yang berlaku sudah disalin ke setiap
 * PurchaseItem saat nota dibuat.
 */

import { getPrisma } from "@/lib/prisma";
import { withOwner, ok, AturanBisnisError } from "@/lib/api-helpers";
import { catatAuditLepas } from "@/lib/audit";
import { validasiProduk } from "../route";

export const PUT = withOwner(async (req, user, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const db = getPrisma();

  const sebelum = await db.product.findUnique({ where: { id } });
  if (!sebelum) throw new AturanBisnisError("Barang tidak ditemukan");

  const data = validasiProduk(await req.json());

  const kembar = await db.product.findFirst({
    where: { nama: data.nama, merek: data.merek, NOT: { id } },
  });
  if (kembar) throw new AturanBisnisError(`Barang "${data.nama} ${data.merek}" sudah ada.`);

  const sesudah = await db.product.update({ where: { id }, data });

  const konversiBerubah = sebelum.konversiBeli !== sesudah.konversiBeli;

  await catatAuditLepas({
    userId: user.id,
    aksi: "UPDATE",
    entitas: "Product",
    entitasId: id,
    before: sebelum,
    after: sesudah,
    keterangan: konversiBerubah
      ? `Ubah KONVERSI ${sesudah.nama} ${sesudah.merek}: ${sebelum.konversiBeli} -> ` +
        `${sesudah.konversiBeli} per ${sesudah.namaSatuanBeli}. Stok lama tidak dihitung ulang.`
      : `Ubah barang ${sesudah.nama} ${sesudah.merek}`,
  });

  return ok({ produk: sesudah, konversiBerubah });
});

/** Soft-nonaktif. PRD pasal 7: hapus fisik dilarang. */
export const DELETE = withOwner(async (_req, user, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const db = getPrisma();

  const produk = await db.product.findUnique({ where: { id } });
  if (!produk) throw new AturanBisnisError("Barang tidak ditemukan");

  const stok = await db.stockLot.aggregate({
    where: { productId: id, aktif: true },
    _sum: { qtySisa: true },
  });
  if ((stok._sum.qtySisa ?? 0) > 0) {
    throw new AturanBisnisError(
      "Barang ini masih punya stok. Habiskan atau sesuaikan stoknya dulu sebelum dinonaktifkan."
    );
  }

  const sesudah = await db.product.update({ where: { id }, data: { aktif: !produk.aktif } });

  await catatAuditLepas({
    userId: user.id,
    aksi: "UPDATE",
    entitas: "Product",
    entitasId: id,
    before: { aktif: produk.aktif },
    after: { aktif: sesudah.aktif },
    keterangan: `${sesudah.aktif ? "Aktifkan" : "Nonaktifkan"} barang ${produk.nama} ${produk.merek}`,
  });

  return ok({ produk: sesudah });
});
