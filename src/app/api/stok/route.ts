/**
 * Rincian lot per produk — antrian FIFO apa adanya, supaya owner bisa melihat
 * urutan yang akan dipotong lebih dulu (PRD pasal 4.2).
 * Owner saja: isinya HPP.
 */
import { getPrisma } from "@/lib/prisma";
import { withOwner, ok, AturanBisnisError } from "@/lib/api-helpers";

export const GET = withOwner(async (req) => {
  const productId = new URL(req.url).searchParams.get("product_id");
  if (!productId) throw new AturanBisnisError("Barang belum dipilih");

  const lot = await getPrisma().stockLot.findMany({
    where: { productId, aktif: true, qtySisa: { gt: 0 } },
    orderBy: [{ purchasedAt: "asc" }, { id: "asc" }],
    include: {
      purchaseItem: { include: { purchase: { select: { nomor: true } } } },
    },
  });

  return ok({ lot });
});
