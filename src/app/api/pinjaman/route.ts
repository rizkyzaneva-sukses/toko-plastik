/** Pinjaman owner — owner saja. Tidak ada cek "apakah sudah laba" (PRD pasal 6.4). */
import { withOwner, ok } from "@/lib/api-helpers";
import { catatPinjamanOwner, daftarPinjaman } from "@/lib/pinjaman";
import { saldoPinjamanOwner } from "@/lib/kas";

export const GET = withOwner(async () => {
  const [riwayat, saldo] = await Promise.all([daftarPinjaman(), saldoPinjamanOwner()]);
  return ok({ riwayat, saldo: Number(saldo) });
});

export const POST = withOwner(async (req, user) => {
  const loan = await catatPinjamanOwner(await req.json(), user.id);
  const saldo = await saldoPinjamanOwner();
  return ok({ loan, saldo: Number(saldo) }, 201);
});
