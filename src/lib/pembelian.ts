/**
 * Pembelian — PRD pasal 6.1.
 *
 * "Owner pilih vendor -> barang -> qty dalam satuan beli (karung/dus/iket) ->
 *  sistem konversi ke satuan dasar -> harga beli total atau per satuan dasar ->
 *  cash atau kredit + tempo hari. Simpan = lot baru + (kas keluar atau hutang).
 *  Gagal jika konversi master kosong."
 *
 * Pasal 4.2: ongkir, kuli, biaya lain TIDAK masuk HPP — itu biaya operasional.
 */

import { getPrisma, type Tx } from "@/lib/prisma";
import { AturanBisnisError } from "@/lib/api-helpers";
import { keSatuanDasar } from "@/lib/satuan";
import { rupiahDariInput } from "@/lib/uang";
import { buatLot } from "@/lib/stok";
import { catatKas } from "@/lib/kas";
import { catatAudit } from "@/lib/audit";
import { nomorBerikutnya } from "@/lib/nota";

export interface BarisBeliInput {
  productId: string;
  /** Qty dalam satuan beli: berapa karung / dus / iket / pcs. */
  qtyBeli: number;
  /** Total rupiah untuk baris ini (harga beli x qty), bulat. */
  hppTotal: number;
}

export interface BuatPembelianInput {
  vendorId: string;
  cara: "CASH" | "CREDIT";
  tempoHari?: number;
  items: BarisBeliInput[];
  catatan?: string;
  tanggal?: string;
}

export async function buatPembelian(input: BuatPembelianInput, userId: string) {
  if (!input.items?.length) {
    throw new AturanBisnisError("Nota pembelian kosong. Tambahkan minimal satu barang.");
  }

  return getPrisma().$transaction(async (tx) => {
    const vendor = await tx.party.findFirst({
      where: { id: input.vendorId, tipe: "VENDOR", aktif: true },
    });
    if (!vendor) throw new AturanBisnisError("Vendor tidak ditemukan atau nonaktif");

    if (input.cara !== "CASH" && input.cara !== "CREDIT") {
      throw new AturanBisnisError("Cara bayar harus CASH atau CREDIT");
    }

    const tempoHari = input.cara === "CREDIT" ? Number(input.tempoHari ?? 0) : 0;
    if (input.cara === "CREDIT" && (!Number.isInteger(tempoHari) || tempoHari <= 0)) {
      throw new AturanBisnisError("Pembelian kredit wajib mengisi tempo dalam hari");
    }

    const tanggal = input.tanggal ? new Date(input.tanggal) : new Date();
    if (Number.isNaN(tanggal.getTime())) throw new AturanBisnisError("Tanggal tidak valid");

    // Urutan FIFO ditentukan `purchasedAt`. Nota bertanggal masa depan akan
    // duduk di ekor antrian selamanya dan tidak pernah terpotong lebih dulu,
    // walaupun barangnya sudah di rak. Ditolak, bukan diam-diam diterima.
    const besok = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (tanggal > besok) {
      throw new AturanBisnisError(
        "Tanggal pembelian tidak boleh di masa depan. Urutan FIFO ikut tanggal ini."
      );
    }

    const nomor = await nomorBerikutnya(tx, "PB");

    const purchase = await tx.purchase.create({
      data: {
        nomor,
        vendorId: vendor.id,
        createdById: userId,
        tanggal,
        cara: input.cara,
        tempoHari,
        jatuhTempo:
          input.cara === "CREDIT"
            ? new Date(tanggal.getTime() + tempoHari * 24 * 60 * 60 * 1000)
            : null,
        total: 0n,
        sisaHutang: 0n,
        catatan: input.catatan?.trim() || null,
      },
    });

    let total = 0n;

    for (const baris of input.items) {
      const produk = await tx.product.findFirst({ where: { id: baris.productId, aktif: true } });
      if (!produk) throw new AturanBisnisError("Barang tidak ditemukan atau sudah nonaktif");

      // Konversi disalin ke nota, bukan dibaca ulang nanti (pasal 13).
      const qtyDasar = keSatuanDasar(Number(baris.qtyBeli), produk.konversiBeli);
      const hppTotal = rupiahDariInput(baris.hppTotal, "Harga beli");
      if (hppTotal <= 0n) throw new AturanBisnisError("Harga beli harus lebih dari 0");

      const item = await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: produk.id,
          qtyBeli: Number(baris.qtyBeli),
          konversiSaat: produk.konversiBeli,
          qtyDasar,
          hppTotal,
        },
      });

      // PRD pasal 4.2: setiap baris pembelian = satu lot FIFO.
      await buatLot(tx, {
        productId: produk.id,
        purchaseItemId: item.id,
        sumber: "PURCHASE",
        qty: qtyDasar,
        hppTotal,
        purchasedAt: tanggal,
        ref: nomor,
      });

      total += hppTotal;
    }

    // PRD pasal 4.4: beli cash -> kas keluar. Beli kredit -> hutang, kas diam.
    const sisaHutang = input.cara === "CREDIT" ? total : 0n;

    const final = await tx.purchase.update({
      where: { id: purchase.id },
      data: { total, sisaHutang },
    });

    if (input.cara === "CASH" && total > 0n) {
      await catatKas(tx, {
        jenis: "PURCHASE",
        arah: "KELUAR",
        nominal: total,
        keterangan: `Pembelian cash ${nomor} - ${vendor.nama}`,
        refTipe: "PURCHASE",
        refId: purchase.id,
        userId,
        tanggal,
      });
    }

    await catatAudit(tx, {
      userId,
      aksi: "CREATE",
      entitas: "Purchase",
      entitasId: purchase.id,
      after: { nomor, total, cara: input.cara, vendor: vendor.nama, tempoHari },
      keterangan: `Pembelian ${nomor}`,
    });

    return final;
  });
}

/**
 * VOID pembelian — owner saja.
 * Hanya boleh kalau lot-nya belum tersentuh sama sekali. Kalau barangnya sudah
 * laku, membatalkan lot berarti memalsukan HPP nota penjualan yang sudah jadi.
 */
export async function voidPembelian(purchaseId: string, alasan: string, userId: string) {
  const alasanBersih = alasan?.trim();
  if (!alasanBersih) throw new AturanBisnisError("Void wajib menyebutkan alasan");

  return getPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM purchases WHERE id = ${purchaseId} FOR UPDATE`;

    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: { include: { lot: true } }, allocations: true, vendor: true },
    });
    if (!purchase) throw new AturanBisnisError("Nota pembelian tidak ditemukan");
    if (purchase.status === "VOID") throw new AturanBisnisError("Nota ini sudah void");

    if (purchase.allocations.length > 0) {
      throw new AturanBisnisError(
        "Nota ini sudah dibayar sebagian atau lunas. Batalkan dulu pembayarannya."
      );
    }

    for (const item of purchase.items) {
      const lot = item.lot;
      if (!lot) continue;
      if (lot.qtySisa !== lot.qtyAwal) {
        throw new AturanBisnisError(
          "Barang dari nota ini sudah sebagian terjual atau tersusut. Nota tidak bisa " +
            "di-void; koreksi lewat penyesuaian stok dengan alasan tertulis."
        );
      }
      await tx.stockLot.update({
        where: { id: lot.id },
        data: { aktif: false, qtySisa: 0, hppSisa: 0n },
      });
    }

    if (purchase.cara === "CASH" && purchase.total > 0n) {
      await catatKas(tx, {
        jenis: "VOID",
        arah: "MASUK",
        nominal: purchase.total,
        keterangan: `Void pembelian ${purchase.nomor}: ${alasanBersih}`,
        refTipe: "PURCHASE_VOID",
        refId: purchase.id,
        userId,
      });
    }

    const hasil = await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        status: "VOID",
        sisaHutang: 0n,
        voidAt: new Date(),
        voidAlasan: alasanBersih,
      },
    });

    await catatAudit(tx, {
      userId,
      aksi: "VOID",
      entitas: "Purchase",
      entitasId: purchase.id,
      before: { status: purchase.status, total: purchase.total, sisaHutang: purchase.sisaHutang },
      after: { status: "VOID", sisaHutang: 0 },
      keterangan: `Void pembelian ${purchase.nomor}: ${alasanBersih}`,
    });

    return hasil;
  });
}

export async function detailPembelian(db: Tx | ReturnType<typeof getPrisma>, id: string) {
  return db.purchase.findUnique({
    where: { id },
    include: {
      vendor: true,
      createdBy: { select: { nama: true } },
      items: { include: { product: true, lot: true } },
      allocations: { include: { payment: true } },
    },
  });
}
