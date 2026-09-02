import { withOwner, ok } from "@/lib/api-helpers";
import { voidPembelian } from "@/lib/pembelian";

export const POST = withOwner(async (req, user, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const { alasan } = await req.json();
  const nota = await voidPembelian(id, alasan, user.id);
  return ok({ nota });
});
