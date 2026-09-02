import { withAuth, ok } from "@/lib/api-helpers";
import { laporanPiutang } from "@/lib/laporan";

/** Kasir butuh daftar piutang untuk menerima pelunasan (PRD pasal 3). */
export const GET = withAuth(async () => ok({ piutang: await laporanPiutang() }));
