/**
 * Master barang — PRD pasal 5.
 * Baca: owner + kasir (kasir perlu daftar barang untuk menjual).
 * Tulis: owner saja (pasal 3 & pasal 13: konversi hanya owner, ber-audit).
 */

import { getPrisma } from "@/lib/prisma";
import { withAuth, withOwner, ok, AturanBisnisError } from "@/lib/api-helpers";
import { catatAuditLepas } from "@/lib/audit";
import { stokProduk } from "@/lib/stok";
import type { Tx } from "@/lib/prisma";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const semua = url.searchParams.get("semua") === "1";
  const db = getPrisma();
  // PRD pasal 3: kasir tidak boleh melihat HPP. Nilai stok DIBUANG di server,
  // bukan sekadar disembunyikan di layar.
  const bolehLihatHpp = user.role === "OWNER";

  const produk = await db.product.findMany({
    where: semua ? {} : { aktif: true },
    orderBy: [{ nama: "asc" }, { merek: "asc" }],
  });

  const agg = await db.stockLot.groupBy({
    by: ["productId"],
    where: { aktif: true },
    _sum: { qtySisa: true, hppSisa: true },
  });
  const peta = new Map(agg.map((a) => [a.productId, a]));

  return ok({
    produk: produk.map((p) => ({
      ...p,
      stokQty: peta.get(p.id)?._sum.qtySisa ?? 0,
      stokNilai: bolehLihatHpp ? Number(peta.get(p.id)?._sum.hppSisa ?? 0n) : null,
    })),
  });
});

interface ProdukBody {
  nama?: string;
  merek?: string;
  kategori?: string;
  satuanDasar?: string;
  namaSatuanBeli?: string;
  konversiBeli?: number;
  hargaJualDefault?: number;
  hargaJualPerQty?: number;
}

const SATUAN_VALID = ["GRAM", "IKET", "PCS"];

export function validasiProduk(b: ProdukBody) {
  const nama = b.nama?.trim();
  const merek = b.merek?.trim();
  if (!nama) throw new AturanBisnisError("Nama barang wajib diisi");
  // PRD A14: merek berbeda = SKU berbeda, jadi merek tidak boleh kosong.
  if (!merek) throw new AturanBisnisError("Merek wajib diisi. Merek berbeda = SKU berbeda.");
  if (!b.satuanDasar || !SATUAN_VALID.includes(b.satuanDasar)) {
    throw new AturanBisnisError("Satuan dasar harus GRAM, IKET, atau PCS");
  }

  const namaSatuanBeli = b.namaSatuanBeli?.trim();
  if (!namaSatuanBeli) {
    throw new AturanBisnisError("Nama satuan beli wajib diisi (karung, dus, iket, pcs)");
  }

  const konversiBeli = Number(b.konversiBeli);
  if (!Number.isInteger(konversiBeli) || konversiBeli <= 0) {
    throw new AturanBisnisError(
      "Konversi beli harus bilangan bulat positif. Contoh: 1 karung = 50000 gram."
    );
  }
  // PRD pasal 4.1: plastik dan pcs tidak mengenal konversi gram (A13).
  if (b.satuanDasar !== "GRAM" && konversiBeli !== 1) {
    throw new AturanBisnisError(
      "Untuk satuan IKET dan PCS, konversi beli harus 1. Tidak ada konversi gram di transaksi."
    );
  }

  const hargaJualDefault = Number(b.hargaJualDefault);
  if (!Number.isInteger(hargaJualDefault) || hargaJualDefault < 0) {
    throw new AturanBisnisError("Harga jual harus rupiah bulat, tanpa desimal");
  }

  const hargaJualPerQty = Number(b.hargaJualPerQty ?? 1);
  if (!Number.isInteger(hargaJualPerQty) || hargaJualPerQty <= 0) {
    throw new AturanBisnisError("Satuan harga jual harus bilangan bulat positif");
  }
  if (b.satuanDasar !== "GRAM" && hargaJualPerQty !== 1) {
    throw new AturanBisnisError("Untuk IKET dan PCS, harga jual ditulis per 1 satuan");
  }

  return {
    nama,
    merek,
    kategori: b.kategori?.trim() || null,
    satuanDasar: b.satuanDasar as "GRAM" | "IKET" | "PCS",
    namaSatuanBeli,
    konversiBeli,
    hargaJualDefault,
    hargaJualPerQty,
  };
}

export const POST = withOwner(async (req, user) => {
  const data = validasiProduk(await req.json());
  const db = getPrisma();

  const kembar = await db.product.findFirst({
    where: { nama: data.nama, merek: data.merek },
  });
  if (kembar) {
    throw new AturanBisnisError(`Barang "${data.nama} ${data.merek}" sudah ada.`);
  }

  const produk = await db.product.create({ data });

  await catatAuditLepas({
    userId: user.id,
    aksi: "CREATE",
    entitas: "Product",
    entitasId: produk.id,
    after: produk,
    keterangan: `Tambah barang ${produk.nama} ${produk.merek}`,
  });

  const stok = await stokProduk(db as unknown as Tx, produk.id);
  return ok({ produk: { ...produk, stokQty: stok.qty, stokNilai: Number(stok.nilai) } }, 201);
});
