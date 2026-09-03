/**
 * Dashboard komprehensif — owner saja.
 *
 * GET /api/dashboard?dari=YYYY-MM-DD&sampai=YYYY-MM-DD atau ?hari=7
 */

import { withOwner, ok } from "@/lib/api-helpers";
import {
  kartuRingkasan,
  omzetRentang,
  produkTerlarisRentang,
  produkStokRendah,
  aktivitasTerakhir,
  hutangPiutangSegera,
} from "@/lib/dashboard";
import { awalHariWIB, akhirHariWIB, hariWIB } from "@/lib/waktu";

export const GET = withOwner(async (req) => {
  const url = new URL(req.url);
  const dariParam = url.searchParams.get("dari");
  const sampaiParam = url.searchParams.get("sampai");
  const hariParam = Number(url.searchParams.get("hari"));

  let dari: Date;
  let sampai: Date;

  if (dariParam && sampaiParam) {
    dari = awalHariWIB(dariParam);
    sampai = akhirHariWIB(sampaiParam);
  } else {
    const jumlahHari = Math.min(Math.max(hariParam || 7, 1), 90);
    const sekarang = new Date();
    sampai = akhirHariWIB(hariWIB(sekarang));
    const mulai = new Date(sekarang.getTime() - (jumlahHari - 1) * 24 * 60 * 60 * 1000);
    dari = awalHariWIB(hariWIB(mulai));
  }

  const [ringkasan, grafik, terlaris, stokRendah, aktivitas, segera] =
    await Promise.all([
      kartuRingkasan(),
      omzetRentang(dari, sampai),
      produkTerlarisRentang(dari, sampai, 5),
      produkStokRendah(5),
      aktivitasTerakhir(5),
      hutangPiutangSegera(3),
    ]);

  return ok({
    ringkasan,
    grafik,
    terlaris,
    stokRendah,
    aktivitas,
    segera,
    rentang: {
      dari: hariWIB(dari),
      sampai: hariWIB(sampai),
    },
  });
});

