/** Pelunasan — kasir boleh "terima pelunasan piutang sederhana" (PRD pasal 3). */
import { getPrisma } from "@/lib/prisma";
import { withAuth, withOwner, ok, AturanBisnisError } from "@/lib/api-helpers";
import { buatPembayaran } from "@/lib/pembayaran";

export const GET = withOwner(async (req) => {
  const url = new URL(req.url);
  const batas = Math.min(Number(url.searchParams.get("batas") ?? 50), 200);

  const pembayaran = await getPrisma().payment.findMany({
    orderBy: { tanggal: "desc" },
    take: batas,
    include: {
      party: { select: { nama: true, tipe: true } },
      createdBy: { select: { nama: true } },
      allocations: {
        include: {
          purchase: { select: { nomor: true } },
          sale: { select: { nomor: true } },
        },
      },
    },
  });

  return ok({ pembayaran });
});

export const POST = withAuth(async (req, user) => {
  const body = await req.json();

  // Kasir hanya boleh menerima uang masuk dari customer.
  // Membayar hutang ke vendor adalah keputusan kas, itu wewenang owner.
  if (user.role !== "OWNER" && body.arah !== "CUSTOMER") {
    throw new AturanBisnisError("Hanya owner yang boleh mencatat pembayaran hutang ke vendor.");
  }

  const hasil = await buatPembayaran(body, user.id);
  return ok(hasil, 201);
});
