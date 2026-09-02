import { getPrisma } from "@/lib/prisma";
import { withAuth, ok, AturanBisnisError } from "@/lib/api-helpers";
import { detailPenjualan } from "@/lib/penjualan";

export const GET = withAuth(async (_req, user, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const nota = await detailPenjualan(getPrisma(), id);
  if (!nota) throw new AturanBisnisError("Nota tidak ditemukan");

  // PRD pasal 3 & A10: HPP dan jejak konsumsi lot tidak dibuka ke kasir.
  // Dibuang di server, bukan sekadar tidak ditampilkan di layar.
  if (user.role !== "OWNER") {
    return ok({
      nota: {
        ...nota,
        hppTotal: null,
        items: nota.items.map((it) => {
          const { hpp: _hpp, consumptions: _konsumsi, ...sisa } = it;
          return { ...sisa, hpp: null };
        }),
      },
    });
  }

  return ok({ nota });
});
