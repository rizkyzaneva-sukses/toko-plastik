/**
 * Penjualan — kasir DAN owner boleh membuat (PRD pasal 3).
 * Void ada di route terpisah dan hanya untuk owner (A10).
 */

import { getPrisma } from "@/lib/prisma";
import { withAuth, ok } from "@/lib/api-helpers";
import { buatPenjualan } from "@/lib/penjualan";
import { awalHariWIB } from "@/lib/waktu";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const batas = Math.min(Number(url.searchParams.get("batas") ?? 50), 200);
  const hariIni = url.searchParams.get("hari_ini") === "1";

  const awal = awalHariWIB();

  const nota = await getPrisma().sale.findMany({
    where: hariIni ? { tanggal: { gte: awal } } : {},
    orderBy: { tanggal: "desc" },
    take: batas,
    include: {
      customer: { select: { nama: true } },
      kasir: { select: { nama: true } },
      items: {
        include: { product: { select: { nama: true, merek: true, satuanDasar: true } } },
      },
    },
  });

  // PRD pasal 3 & A10: HPP tidak dibuka ke kasir, termasuk lewat API langsung.
  return ok({ nota: user.role === "OWNER" ? nota : nota.map(tanpaHpp) });
});

/** Buang seluruh jejak HPP dari sebuah nota sebelum dikirim ke kasir. */
function tanpaHpp<T extends { hppTotal?: unknown; items?: unknown[] }>(nota: T) {
  const { hppTotal: _hppTotal, ...sisa } = nota;
  return {
    ...sisa,
    hppTotal: null,
    items: (nota.items ?? []).map((it) => {
      const { hpp: _hpp, consumptions: _konsumsi, ...sisaItem } = it as Record<string, unknown>;
      return { ...sisaItem, hpp: null };
    }),
  };
}

export const POST = withAuth(async (req, user) => {
  const body = await req.json();
  const sale = await buatPenjualan(body, user.id);

  // Kembalikan nota lengkap supaya layar kasir bisa langsung menampilkan
  // nomor nota dan rincian (PRD pasal 8: struk tidak dicetak, cukup di layar).
  const detail = await getPrisma().sale.findUnique({
    where: { id: sale.id },
    include: {
      customer: { select: { nama: true } },
      items: { include: { product: { select: { nama: true, merek: true, satuanDasar: true } } } },
    },
  });

  return ok({ nota: detail }, 201);
});
