import { withAuth, ok } from "@/lib/api-helpers";
import { laporanStok } from "@/lib/laporan";

/**
 * Kasir boleh "lihat stok" (PRD pasal 3), tapi dalam satuan jual saja —
 * nilai rupiah HPP disembunyikan supaya HPP tidak bocor ke kasir.
 */
export const GET = withAuth(async (_req, user) => {
  const stok = await laporanStok();
  if (user.role !== "OWNER") {
    return ok({ stok: stok.map(({ nilai: _nilai, ...sisa }) => ({ ...sisa, nilai: null })) });
  }
  return ok({ stok });
});
