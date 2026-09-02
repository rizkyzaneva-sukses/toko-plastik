/** Pembelian — owner saja (PRD pasal 3: kasir tidak boleh ubah HPP). */
import { getPrisma } from "@/lib/prisma";
import { withOwner, ok } from "@/lib/api-helpers";
import { buatPembelian } from "@/lib/pembelian";

export const GET = withOwner(async (req) => {
  const url = new URL(req.url);
  const batas = Math.min(Number(url.searchParams.get("batas") ?? 50), 200);

  const nota = await getPrisma().purchase.findMany({
    orderBy: { tanggal: "desc" },
    take: batas,
    include: {
      vendor: { select: { nama: true } },
      items: { include: { product: { select: { nama: true, merek: true, satuanDasar: true } } } },
    },
  });

  return ok({ nota });
});

export const POST = withOwner(async (req, user) => {
  const purchase = await buatPembelian(await req.json(), user.id);
  const detail = await getPrisma().purchase.findUnique({
    where: { id: purchase.id },
    include: {
      vendor: { select: { nama: true } },
      items: { include: { product: { select: { nama: true, merek: true, satuanDasar: true } } } },
    },
  });
  return ok({ nota: detail }, 201);
});
