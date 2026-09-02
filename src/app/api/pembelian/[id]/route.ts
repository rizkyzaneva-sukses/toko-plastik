import { getPrisma } from "@/lib/prisma";
import { withOwner, ok, AturanBisnisError } from "@/lib/api-helpers";
import { detailPembelian } from "@/lib/pembelian";

export const GET = withOwner(async (_req, _user, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const nota = await detailPembelian(getPrisma(), id);
  if (!nota) throw new AturanBisnisError("Nota tidak ditemukan");
  return ok({ nota });
});
