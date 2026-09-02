/** Kas — saldo + mutasi. Owner saja (PRD pasal 8: kasir jangan lihat menu akuntansi). */
import { withOwner, ok } from "@/lib/api-helpers";
import { mutasiKas } from "@/lib/laporan";
import { saldoKas } from "@/lib/kas";
import { rentangLaporanWIB } from "@/lib/waktu";

export const GET = withOwner(async (req) => {
  const url = new URL(req.url);

  const { dari, sampai } = rentangLaporanWIB(
    url.searchParams.get("dari"),
    url.searchParams.get("sampai")
  );

  const [mutasi, saldo] = await Promise.all([mutasiKas(dari, sampai), saldoKas()]);

  return ok({ ...mutasi, saldoSekarang: Number(saldo) });
});
