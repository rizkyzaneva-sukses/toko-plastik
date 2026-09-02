/** PRD A10 & A11: void hanya owner, wajib alasan, stok dan kas dibalik, log terisi. */
import { withOwner, ok } from "@/lib/api-helpers";
import { voidPenjualan } from "@/lib/penjualan";

export const POST = withOwner(async (req, user, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const { alasan } = await req.json();
  const nota = await voidPenjualan(id, alasan, user.id);
  return ok({ nota });
});
