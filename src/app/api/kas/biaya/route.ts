/** Biaya operasional — kas keluar, tidak mengubah HPP (PRD pasal 4.2). */
import { withOwner, ok } from "@/lib/api-helpers";
import { catatBiaya } from "@/lib/pinjaman";

export const POST = withOwner(async (req, user) => {
  const entry = await catatBiaya(await req.json(), user.id);
  return ok({ entry }, 201);
});
