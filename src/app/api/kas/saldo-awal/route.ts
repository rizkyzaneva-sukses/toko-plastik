/** Saldo kas fisik di laci saat go-live (PRD pasal 12). Hanya boleh sekali. */
import { getPrisma } from "@/lib/prisma";
import { withOwner, ok } from "@/lib/api-helpers";
import { catatSaldoAwalKas } from "@/lib/pinjaman";

export const GET = withOwner(async () => {
  const ada = await getPrisma().cashEntry.findFirst({ where: { jenis: "OPENING" } });
  return ok({ sudahDiisi: Boolean(ada), entry: ada });
});

export const POST = withOwner(async (req, user) => {
  const { nominal } = await req.json();
  const entry = await catatSaldoAwalKas(nominal, user.id);
  return ok({ entry }, 201);
});
