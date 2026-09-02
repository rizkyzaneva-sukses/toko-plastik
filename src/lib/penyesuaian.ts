/**
 * Penyesuaian stok — PRD pasal 4.5.
 *
 * "Alasan penyesuaian: SUSUT, RUSAK, OPNAME. Wajib catatan."
 * "Qty disesuaikan memotong atau menambah lewat jalur terpisah dari penjualan.
 *  Pengurangan memakai FIFO lot."
 * "Selisih tidak boleh diserap diam-diam."
 *
 * Penyesuaian TIDAK menyentuh kas (tidak ada uang yang pindah) dan TIDAK
 * menjadi omzet — kerugiannya tercatat sebagai nilai HPP yang keluar (A9).
 *
 * CATATAN NILAI UNTUK PENAMBAHAN: PRD tidak mengunci HPP barang yang bertambah
 * saat opname. Aturan yang dipakai di sini, dan ditampilkan di layar:
 * kelebihan fisik dinilai memakai HPP rata-rata stok yang masih ada. Kalau
 * produk sedang kosong sama sekali, owner WAJIB mengisi taksiran HPP — sistem
 * menolak menebak sendiri.
 */

import { getPrisma, type Tx } from "@/lib/prisma";
import { AturanBisnisError } from "@/lib/api-helpers";
import { parseQtyDasar, type SatuanDasar } from "@/lib/satuan";
import { bagiBulat, rupiahDariInput } from "@/lib/uang";
import { potongStokFifo, buatLot, stokProduk } from "@/lib/stok";
import { catatAudit } from "@/lib/audit";
import { nomorBerikutnya } from "@/lib/nota";

export interface PenyesuaianInput {
  productId: string;
  alasan: "SUSUT" | "RUSAK" | "OPNAME";
  /** Untuk SUSUT/RUSAK. Untuk OPNAME arah dihitung dari selisih fisik vs sistem. */
  arah?: "KURANG" | "TAMBAH";
  /** Untuk SUSUT/RUSAK: qty yang hilang. Untuk OPNAME: abaikan, pakai qtyFisik. */
  qty?: string | number;
  /** Khusus OPNAME: hasil hitung fisik dalam satuan dasar. */
  qtyFisik?: string | number;
  /** Wajib. PRD A12: tidak bisa simpan tanpa alasan. */
  catatan: string;
  /** Taksiran HPP total untuk penambahan saat produk sedang kosong. */
  nilaiHppTaksiran?: number;
}

export async function buatPenyesuaian(input: PenyesuaianInput, userId: string) {
  const catatan = input.catatan?.trim();
  if (!catatan) {
    throw new AturanBisnisError(
      "Penyesuaian stok wajib diberi alasan tertulis. Selisih tidak boleh diserap diam-diam."
    );
  }
  if (catatan.length < 4) {
    throw new AturanBisnisError("Alasan terlalu pendek. Tulis penjelasan yang bisa diaudit.");
  }

  return getPrisma().$transaction(async (tx) => {
    const produk = await tx.product.findFirst({ where: { id: input.productId, aktif: true } });
    if (!produk) throw new AturanBisnisError("Barang tidak ditemukan atau sudah nonaktif");

    const satuan = produk.satuanDasar as SatuanDasar;
    const sekarang = await stokProduk(tx, produk.id);

    let arah: "KURANG" | "TAMBAH";
    let qty: number;
    let qtySistem: number | null = null;
    let qtyFisik: number | null = null;

    if (input.alasan === "OPNAME") {
      qtyFisik = parseQtyDasarNolBoleh(input.qtyFisik, satuan);
      qtySistem = sekarang.qty;
      const selisih = qtyFisik - qtySistem;
      if (selisih === 0) {
        throw new AturanBisnisError(
          "Qty fisik sama dengan qty sistem. Tidak ada yang perlu disesuaikan."
        );
      }
      arah = selisih < 0 ? "KURANG" : "TAMBAH";
      qty = Math.abs(selisih);
    } else {
      // Di cabang ini alasan pasti SUSUT atau RUSAK, dan keduanya hanya bisa
      // mengurangi stok. Penambahan cuma lewat pembelian atau opname.
      if (input.arah === "TAMBAH") {
        throw new AturanBisnisError(
          "Susut dan rusak hanya mengurangi stok. Penambahan hanya lewat pembelian atau opname."
        );
      }
      arah = "KURANG";
      qty = parseQtyDasar(input.qty, satuan);
    }

    const nomor = await nomorBerikutnya(tx, "TR");
    let nilaiHpp: bigint;

    const adjustment = await tx.stockAdjustment.create({
      data: {
        nomor,
        productId: produk.id,
        alasan: input.alasan,
        arah,
        qty,
        catatan,
        nilaiHpp: 0n,
        qtySistem,
        qtyFisik,
        createdById: userId,
      },
    });

    if (arah === "KURANG") {
      // Pengurangan memakai FIFO lot (pasal 4.5). Kalau stok kurang -> ditolak total.
      const konsumsi = await potongStokFifo(tx, {
        productId: produk.id,
        qty,
        namaBarang: `${produk.nama} ${produk.merek}`,
        satuan,
      });

      await tx.adjustmentLotConsumption.createMany({
        data: konsumsi.map((k) => ({
          adjustmentId: adjustment.id,
          lotId: k.lotId,
          qty: k.qty,
          hpp: k.hpp,
        })),
      });

      nilaiHpp = konsumsi.reduce((a, k) => a + k.hpp, 0n);
    } else {
      // Penambahan: dinilai dari HPP rata-rata stok tersisa, atau taksiran owner.
      if (sekarang.qty > 0) {
        nilaiHpp = bagiBulat(sekarang.nilai * BigInt(qty), BigInt(sekarang.qty));
      } else if (input.nilaiHppTaksiran !== undefined && input.nilaiHppTaksiran !== null) {
        nilaiHpp = rupiahDariInput(input.nilaiHppTaksiran, "Taksiran HPP");
      } else {
        throw new AturanBisnisError(
          "Stok barang ini sedang kosong, jadi sistem tidak punya dasar HPP. " +
            "Isi taksiran HPP total untuk kelebihan fisik ini."
        );
      }

      await buatLot(tx, {
        productId: produk.id,
        sumber: "OPENING",
        qty,
        hppTotal: nilaiHpp,
        purchasedAt: new Date(),
        ref: nomor,
      });
    }

    const final = await tx.stockAdjustment.update({
      where: { id: adjustment.id },
      data: { nilaiHpp },
    });

    await catatAudit(tx, {
      userId,
      aksi: input.alasan === "OPNAME" ? "OPNAME" : "ADJUST",
      entitas: "StockAdjustment",
      entitasId: adjustment.id,
      before: { qtySistem: sekarang.qty, nilaiStok: sekarang.nilai },
      after: { nomor, alasan: input.alasan, arah, qty, nilaiHpp, qtyFisik },
      keterangan: `${input.alasan} ${produk.nama} ${produk.merek} (${nomor}): ${catatan}`,
    });

    return final;
  });
}

/** Opname boleh menghasilkan 0 (barang habis), jadi 0 diterima di sini. */
function parseQtyDasarNolBoleh(nilai: unknown, satuan: SatuanDasar): number {
  const teks = typeof nilai === "string" ? nilai.trim() : String(nilai ?? "");
  if (teks === "0") return 0;
  return parseQtyDasar(nilai, satuan);
}

export async function daftarPenyesuaian(db: Tx | ReturnType<typeof getPrisma>, batas = 100) {
  return db.stockAdjustment.findMany({
    orderBy: { tanggal: "desc" },
    take: batas,
    include: {
      product: { select: { nama: true, merek: true, satuanDasar: true } },
      createdBy: { select: { nama: true } },
    },
  });
}
