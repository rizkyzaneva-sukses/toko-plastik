/**
 * Stok awal go-live — PRD pasal 12.
 *
 * "Stok fisik dihitung opname, masuk sebagai lot OPENING dengan HPP taksiran
 *  owner." dan "HPP opening adalah taksiran. Tidak perlu sempurna. Yang wajib
 *  sempurna adalah qty fisik hari go-live."
 *
 * Karena itu: qty divalidasi ketat (integer satuan dasar), HPP diterima apa
 * adanya sebagai taksiran, dan seluruhnya masuk audit log. Lot OPENING tidak
 * menyentuh kas — barangnya sudah ada sebelum sistem menyala.
 */

import { getPrisma } from "@/lib/prisma";
import { withOwner, ok, AturanBisnisError } from "@/lib/api-helpers";
import { parseQtyDasar, type SatuanDasar } from "@/lib/satuan";
import { rupiahDariInput } from "@/lib/uang";
import { buatLot } from "@/lib/stok";
import { catatAudit } from "@/lib/audit";

export const GET = withOwner(async () => {
  const lot = await getPrisma().stockLot.findMany({
    where: { sumber: "OPENING", ref: "OPENING" },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { nama: true, merek: true, satuanDasar: true } } },
  });
  return ok({ lot });
});

export const POST = withOwner(async (req, user) => {
  const b = await req.json();

  return ok(
    await getPrisma().$transaction(async (tx) => {
      const produk = await tx.product.findFirst({ where: { id: b.productId, aktif: true } });
      if (!produk) throw new AturanBisnisError("Barang tidak ditemukan atau sudah nonaktif");

      const qty = parseQtyDasar(b.qty, produk.satuanDasar as SatuanDasar);
      const hppTotal = rupiahDariInput(b.hppTotal, "Taksiran HPP total");
      if (hppTotal <= 0n) throw new AturanBisnisError("Taksiran HPP harus lebih dari 0");

      const sudahAda = await tx.stockLot.findFirst({
        where: { productId: produk.id, sumber: "OPENING", ref: "OPENING" },
      });
      if (sudahAda) {
        throw new AturanBisnisError(
          `Stok awal ${produk.nama} ${produk.merek} sudah pernah dimasukkan. ` +
            `Koreksi lewat Penyesuaian Stok dengan alasan OPNAME supaya ada jejaknya.`
        );
      }

      const lot = await buatLot(tx, {
        productId: produk.id,
        sumber: "OPENING",
        qty,
        hppTotal,
        purchasedAt: b.tanggal ? new Date(b.tanggal) : new Date(),
        ref: "OPENING",
      });

      await catatAudit(tx, {
        userId: user.id,
        aksi: "CREATE",
        entitas: "StockLot",
        entitasId: lot.id,
        after: { produk: `${produk.nama} ${produk.merek}`, qty, hppTotal, sumber: "OPENING" },
        keterangan:
          `Stok awal go-live ${produk.nama} ${produk.merek}: ${qty} ` +
          `(HPP taksiran owner, bukan harga beli nyata)`,
      });

      return { lot };
    }),
    201
  );
});
