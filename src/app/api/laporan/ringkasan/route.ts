import { withAuth, ok } from "@/lib/api-helpers";
import { ringkasan } from "@/lib/laporan";

/**
 * Kasir hanya melihat angka operasional hari ini; angka kas, hutang, piutang,
 * dan pinjaman owner disembunyikan (PRD pasal 3 & pasal 8).
 */
export const GET = withAuth(async (_req, user) => {
  const data = await ringkasan();
  if (user.role !== "OWNER") {
    return ok({
      ringkasan: {
        omzetHariIni: data.omzetHariIni,
        nilaiStok: null,
        saldoKas: null,
        totalHutang: null,
        totalPiutang: null,
        pinjamanOwner: null,
        labaKotorHariIni: null,
      },
    });
  }
  return ok({ ringkasan: data });
});
