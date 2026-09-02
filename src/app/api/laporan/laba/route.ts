/** Laba kotor FIFO periode — owner saja. Selalu disertai peringatan kas (pasal 10). */
import { withOwner, ok } from "@/lib/api-helpers";
import { laporanLaba, PERINGATAN_LABA } from "@/lib/laporan";
import { saldoKas } from "@/lib/kas";
import { rentangLaporanWIB } from "@/lib/waktu";

export const GET = withOwner(async (req) => {
  const url = new URL(req.url);

  // Batas hari mengikuti WIB, bukan zona waktu container.
  const { dari, sampai } = rentangLaporanWIB(
    url.searchParams.get("dari"),
    url.searchParams.get("sampai")
  );

  const [laba, saldo] = await Promise.all([laporanLaba(dari, sampai), saldoKas()]);

  return ok({
    laba,
    saldoKas: Number(saldo),
    peringatan: PERINGATAN_LABA,
    periode: { dari: dari.toISOString(), sampai: sampai.toISOString() },
  });
});
