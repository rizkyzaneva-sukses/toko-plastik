/**
 * Jembatan antara FIFO murni (src/lib/fifo.ts) dan database.
 *
 * PRD pasal 9: "Transaksi DB + row lock lot." Lot dibaca dengan SELECT ... FOR
 * UPDATE supaya dua kasir yang menjual barang sama pada saat bersamaan tidak
 * bisa memakan stok yang sama dua kali (PRD pasal 13).
 */

import type { Tx } from "@/lib/prisma";
import { rencanaKonsumsi, type KonsumsiLot, type LotFifo } from "@/lib/fifo";
import { AturanBisnisError } from "@/lib/api-helpers";
import type { SatuanDasar } from "@/lib/satuan";
import { SATUAN_LABEL } from "@/lib/satuan";

interface BarisLotMentah {
  id: string;
  qtySisa: number;
  hppSisa: bigint | string | number;
}

/**
 * Baca antrian lot aktif sebuah produk, terurut tertua dulu, DENGAN row lock.
 * Wajib dipanggil di dalam `prisma.$transaction`.
 */
export async function ambilLotTerkunci(tx: Tx, productId: string): Promise<LotFifo[]> {
  const baris = await tx.$queryRaw<BarisLotMentah[]>`
    SELECT id, "qtySisa", "hppSisa"
    FROM stock_lots
    WHERE "productId" = ${productId}
      AND aktif = true
      AND "qtySisa" > 0
    ORDER BY "purchasedAt" ASC, id ASC
    FOR UPDATE
  `;

  return baris.map((b) => ({
    lotId: b.id,
    qtySisa: Number(b.qtySisa),
    hppSisa: BigInt(b.hppSisa),
  }));
}

/** Stok saat ini tanpa mengunci — untuk tampilan layar, bukan untuk transaksi. */
export async function stokProduk(
  tx: Tx,
  productId: string
): Promise<{ qty: number; nilai: bigint }> {
  const agg = await tx.stockLot.aggregate({
    where: { productId, aktif: true },
    _sum: { qtySisa: true, hppSisa: true },
  });
  return {
    qty: agg._sum.qtySisa ?? 0,
    nilai: agg._sum.hppSisa ?? 0n,
  };
}

/**
 * Potong stok mengikuti FIFO dan tulis perubahannya ke lot.
 * Melempar StokKurangError kalau tidak cukup — pemanggil tidak boleh menangkap
 * lalu menyimpan sebagian (PRD A4: seluruh nota ditolak).
 */
export async function potongStokFifo(
  tx: Tx,
  args: { productId: string; qty: number; namaBarang: string; satuan: SatuanDasar }
): Promise<KonsumsiLot[]> {
  const lots = await ambilLotTerkunci(tx, args.productId);
  const konsumsi = rencanaKonsumsi(lots, args.qty, {
    namaBarang: args.namaBarang,
    satuan: SATUAN_LABEL[args.satuan],
  });

  for (const k of konsumsi) {
    await tx.stockLot.update({
      where: { id: k.lotId },
      data: { qtySisa: { decrement: k.qty }, hppSisa: { decrement: k.hpp } },
    });
  }

  return konsumsi;
}

/**
 * Kembalikan stok ke lot semula. Dipakai saat VOID (PRD pasal 4.3:
 * "membalik stok ke lot semula jika masih tertelusur").
 */
export async function kembalikanStokKeLot(
  tx: Tx,
  konsumsi: { lotId: string; qty: number; hpp: bigint }[]
) {
  for (const k of konsumsi) {
    const lot = await tx.stockLot.findUnique({ where: { id: k.lotId } });
    if (!lot) {
      throw new AturanBisnisError(
        "Lot asal transaksi ini tidak ditemukan, stok tidak bisa dikembalikan otomatis. " +
          "Gunakan penyesuaian stok dengan alasan tertulis."
      );
    }
    if (!lot.aktif) {
      throw new AturanBisnisError(
        "Lot asal sudah dibatalkan lewat void pembelian. Void ini harus dikoreksi " +
          "lewat penyesuaian stok, bukan pembalikan otomatis."
      );
    }
    await tx.stockLot.update({
      where: { id: k.lotId },
      data: { qtySisa: { increment: k.qty }, hppSisa: { increment: k.hpp } },
    });
  }
}

/**
 * Buat lot baru. Satu baris pembelian = satu lot (PRD pasal 4.2).
 * Dipakai juga oleh stok awal go-live (sumber OPENING, PRD pasal 12).
 */
export async function buatLot(
  tx: Tx,
  args: {
    productId: string;
    purchaseItemId?: string;
    sumber: "PURCHASE" | "OPENING";
    qty: number;
    hppTotal: bigint;
    purchasedAt: Date;
    ref?: string;
  }
) {
  if (args.qty <= 0) throw new AturanBisnisError("Qty lot harus lebih dari 0");
  if (args.hppTotal < 0n) throw new AturanBisnisError("HPP lot tidak boleh negatif");

  return tx.stockLot.create({
    data: {
      productId: args.productId,
      purchaseItemId: args.purchaseItemId,
      sumber: args.sumber,
      qtyAwal: args.qty,
      qtySisa: args.qty,
      hppTotalAwal: args.hppTotal,
      hppSisa: args.hppTotal,
      purchasedAt: args.purchasedAt,
      ref: args.ref,
    },
  });
}
