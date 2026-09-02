import { withOwner, ok } from "@/lib/api-helpers";
import { voidPembayaran } from "@/lib/pembayaran";

export const POST = withOwner(async (req, user, ctx) => {
  const { id } = (await ctx.params) as { id: string };
  const { alasan } = await req.json();
  const pembayaran = await voidPembayaran(id, alasan, user.id);
  return ok({ pembayaran });
});
