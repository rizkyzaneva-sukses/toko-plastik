/** Audit log — owner only (PRD A10: "Audit tidak perlu dibuka ke kasir"). */
import { getPrisma } from "@/lib/prisma";
import { withOwner, ok } from "@/lib/api-helpers";

export const GET = withOwner(async (req) => {
  const url = new URL(req.url);
  const batas = Math.min(Number(url.searchParams.get("batas") ?? 100), 500);
  const entitas = url.searchParams.get("entitas");

  const log = await getPrisma().auditLog.findMany({
    where: entitas ? { entitas } : {},
    orderBy: { createdAt: "desc" },
    take: batas,
    include: { user: { select: { nama: true, username: true, role: true } } },
  });

  return ok({ log });
});
