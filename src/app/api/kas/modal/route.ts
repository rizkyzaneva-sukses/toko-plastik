/** Setoran modal - kas masuk dari pinjaman/investor/uang pribadi. */
import { withOwner, ok } from "@/lib/api-helpers";
import { catatModal } from "@/lib/pinjaman";

export const POST = withOwner(async (req, user) => {
  const entry = await catatModal(await req.json(), user.id);
  return ok({ entry }, 201);
});
