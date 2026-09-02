/**
 * Penjualan kasir — PRD pasal 6.2.
 *
 * "Sistem kunci lot tertua, hitung HPP baris, tulis konsumsi lot. Jika qty >
 *  stok, transaksi batal seluruhnya (bukan parsial senyap)."
 */

import { getPrisma, type Tx } from "@/lib/prisma";
import { AturanBisnisError } from "@/lib/api-helpers";
import { parseQtyDasar, type SatuanDasar } from "@/lib/satuan";
import { hitungSubtotal, rupiahDariInput } from "@/lib/uang";
import { potongStokFifo, kembalikanStokKeLot } from "@/lib/stok";
import { catatKas } from "@/lib/kas";
import { catatAudit } from "@/lib/audit";
import { nomorBerikutnya } from "@/lib/nota";

export interface BarisJualInput {
  productId: string;
  /** String mentah dari layar — gerbang pasal 4.1 yang menolak desimal. */
  qty: string | number;
  /** Harga boleh diubah kasir; yang dipakai tersimpan di nota (pasal 6.2). */
  hargaRef?: number;
}

export interface BuatPenjualanInput {
  customerId: string;
  cara: "CASH" | "CREDIT";
  tempoHari?: number;
  items: BarisJualInput[];
  catatan?: string;
}

export async function buatPenjualan(input: BuatPenjualanInput, userId: string) {
  if (!input.items?.length) {
    throw new AturanBisnisError("Nota kosong. Tambahkan minimal satu barang.");
  }
  if (input.items.length > 100) {
    throw new AturanBisnisError("Terlalu banyak baris dalam satu nota");
  }
  // Divalidasi di sini, bukan diserahkan ke enum Prisma — supaya nilai ngawur
  // jadi 400 berpesan, bukan 500 "kesalahan di server".
  if (input.cara !== "CASH" && input.cara !== "CREDIT") {
    throw new AturanBisnisError("Cara bayar harus CASH atau CREDIT");
  }

  return getPrisma().$transaction(async (tx) => {
    const customer = await tx.party.findFirst({
      where: { id: input.customerId, tipe: "CUSTOMER", aktif: true },
    });
    if (!customer) throw new AturanBisnisError("Customer tidak ditemukan atau nonaktif");

    // PRD pasal 3: "Customer retail cash boleh bernama UMUM. Kredit wajib nama."
    if (input.cara === "CREDIT" && customer.isSystem) {
      throw new AturanBisnisError(
        "Penjualan kredit wajib atas nama customer. UMUM hanya untuk penjualan cash."
      );
    }

    const tempoHari = input.cara === "CREDIT" ? Number(input.tempoHari ?? 0) : 0;
    if (input.cara === "CREDIT" && (!Number.isInteger(tempoHari) || tempoHari <= 0)) {
      throw new AturanBisnisError("Penjualan kredit wajib mengisi tempo dalam hari");
    }

    const tanggal = new Date();
    const nomor = await nomorBerikutnya(tx, "JL");

    const sale = await tx.sale.create({
      data: {
        nomor,
        customerId: customer.id,
        kasirId: userId,
        tanggal,
        cara: input.cara,
        tempoHari,
        jatuhTempo:
          input.cara === "CREDIT"
            ? new Date(tanggal.getTime() + tempoHari * 24 * 60 * 60 * 1000)
            : null,
        total: 0n,
        hppTotal: 0n,
        sisaPiutang: 0n,
        catatan: input.catatan?.trim() || null,
      },
    });

    let total = 0n;
    let hppTotal = 0n;

    for (const baris of input.items) {
      const produk = await tx.product.findFirst({
        where: { id: baris.productId, aktif: true },
      });
      if (!produk) {
        throw new AturanBisnisError(`Barang tidak ditemukan atau sudah nonaktif`);
      }

      // Gerbang pasal 4.1 — A1: "0,25 kg" ditolak di sini, sebelum menyentuh stok.
      const qty = parseQtyDasar(baris.qty, produk.satuanDasar as SatuanDasar);

      const hargaRef =
        baris.hargaRef === undefined || baris.hargaRef === null
          ? produk.hargaJualDefault
          : Number(rupiahDariInput(baris.hargaRef, "Harga jual"));

      // PRD pasal 2.2: tidak ada promo, bonus, atau cashback di V1. Barang yang
      // keluar tanpa uang harus lewat Penyesuaian Stok supaya ada alasannya
      // tertulis dan nilainya masuk kerugian stok, bukan omzet Rp 0.
      if (hargaRef <= 0) {
        throw new AturanBisnisError(
          `Harga jual ${produk.nama} ${produk.merek} tidak boleh 0. Kalau barang ` +
            `memang diberikan tanpa bayar, catat lewat Penyesuaian Stok dengan alasannya.`
        );
      }

      const qtyRef = produk.hargaJualPerQty;
      const subtotal = hitungSubtotal(hargaRef, qty, qtyRef);

      // Melempar StokKurangError kalau kurang -> seluruh transaksi rollback (A4).
      const konsumsi = await potongStokFifo(tx, {
        productId: produk.id,
        qty,
        namaBarang: `${produk.nama} ${produk.merek}`,
        satuan: produk.satuanDasar as SatuanDasar,
      });

      const hppBaris = konsumsi.reduce((a, k) => a + k.hpp, 0n);

      const item = await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: produk.id,
          qty,
          hargaRef,
          qtyRef,
          subtotal,
          hpp: hppBaris,
        },
      });

      // PRD pasal 7: tanpa tabel ini FIFO tidak auditable.
      await tx.saleLotConsumption.createMany({
        data: konsumsi.map((k) => ({
          saleItemId: item.id,
          lotId: k.lotId,
          qty: k.qty,
          hpp: k.hpp,
        })),
      });

      total += subtotal;
      hppTotal += hppBaris;
    }

    // PRD pasal 4.4: jual cash -> kas masuk. Jual kredit -> kas TIDAK bergerak.
    const sisaPiutang = input.cara === "CREDIT" ? total : 0n;

    const final = await tx.sale.update({
      where: { id: sale.id },
      data: { total, hppTotal, sisaPiutang },
    });

    if (input.cara === "CASH" && total > 0n) {
      await catatKas(tx, {
        jenis: "SALE",
        arah: "MASUK",
        nominal: total,
        keterangan: `Penjualan cash ${nomor}`,
        refTipe: "SALE",
        refId: sale.id,
        userId,
        tanggal,
      });
    }

    await catatAudit(tx, {
      userId,
      aksi: "CREATE",
      entitas: "Sale",
      entitasId: sale.id,
      after: { nomor, total, hppTotal, cara: input.cara, customer: customer.nama },
      keterangan: `Penjualan ${nomor}`,
    });

    return final;
  });
}

/**
 * VOID penjualan — owner saja (PRD pasal 4.3 dan A11).
 * Membalik stok ke lot semula, membalik kas/piutang, dan menulis audit.
 * Tidak ada hapus fisik.
 */
export async function voidPenjualan(saleId: string, alasan: string, userId: string) {
  const alasanBersih = alasan?.trim();
  if (!alasanBersih) throw new AturanBisnisError("Void wajib menyebutkan alasan");

  return getPrisma().$transaction(async (tx) => {
    // Kunci baris notanya dulu, supaya pelunasan yang berjalan bersamaan tidak
    // menyelinap masuk setelah pemeriksaan "sudah ada pembayaran" di bawah.
    await tx.$queryRaw`SELECT id FROM sales WHERE id = ${saleId} FOR UPDATE`;

    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { items: { include: { consumptions: true } }, allocations: true },
    });
    if (!sale) throw new AturanBisnisError("Nota penjualan tidak ditemukan");
    if (sale.status === "VOID") throw new AturanBisnisError("Nota ini sudah void");

    // Uang yang sudah diterima harus dibatalkan dulu lewat void pembayaran,
    // supaya kas tidak dibalik dua kali.
    if (sale.allocations.length > 0) {
      throw new AturanBisnisError(
        "Nota ini sudah menerima pembayaran. Batalkan dulu pembayarannya, baru void notanya."
      );
    }

    for (const item of sale.items) {
      await kembalikanStokKeLot(
        tx,
        item.consumptions.map((c) => ({ lotId: c.lotId, qty: c.qty, hpp: c.hpp }))
      );
    }

    if (sale.cara === "CASH" && sale.total > 0n) {
      await catatKas(tx, {
        jenis: "VOID",
        arah: "KELUAR",
        nominal: sale.total,
        keterangan: `Void penjualan ${sale.nomor}: ${alasanBersih}`,
        refTipe: "SALE_VOID",
        refId: sale.id,
        userId,
      });
    }

    const hasil = await tx.sale.update({
      where: { id: sale.id },
      data: {
        status: "VOID",
        sisaPiutang: 0n,
        voidAt: new Date(),
        voidAlasan: alasanBersih,
      },
    });

    await catatAudit(tx, {
      userId,
      aksi: "VOID",
      entitas: "Sale",
      entitasId: sale.id,
      before: { status: sale.status, total: sale.total, sisaPiutang: sale.sisaPiutang },
      after: { status: "VOID", sisaPiutang: 0 },
      keterangan: `Void penjualan ${sale.nomor}: ${alasanBersih}`,
    });

    return hasil;
  });
}

/** Ringkasan nota untuk layar konfirmasi kasir. */
export async function detailPenjualan(db: Tx | ReturnType<typeof getPrisma>, id: string) {
  return db.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      kasir: { select: { nama: true } },
      items: { include: { product: true, consumptions: { include: { lot: true } } } },
      allocations: { include: { payment: true } },
    },
  });
}
