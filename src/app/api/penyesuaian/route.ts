/** Penyesuaian stok & opname — owner saja (PRD pasal 3: opname tanpa owner dilarang). */
import { getPrisma } from "@/lib/prisma";
import { withOwner, ok } from "@/lib/api-helpers";
import { buatPenyesuaian, daftarPenyesuaian } from "@/lib/penyesuaian";

export const GET = withOwner(async () => {
  return ok({ penyesuaian: await daftarPenyesuaian(getPrisma()) });
});

export const POST = withOwner(async (req, user) => {
  const hasil = await buatPenyesuaian(await req.json(), user.id);
  return ok({ penyesuaian: hasil }, 201);
});
