/**
 * Pelunasan hutang vendor & piutang customer — PRD pasal 6.3.
 *
 * "Pilih pihak -> lihat nota terbuka tertua -> input nominal. Lebih dari sisa
 *  nota ditolak atau dilempar ke nota berikutnya secara eksplisit, tidak
 *  mengendap sebagai uang hantu."
 *
 * Karena itu: alokasi selalu ke nota tertua dulu, hasil pembagiannya
 * dikembalikan ke layar, dan uang yang melebihi total tagihan DITOLAK.
 */

import { getPrisma, type Tx } from "@/lib/prisma";
import { AturanBisnisError } from "@/lib/api-helpers";
import { rupiahDariInput } from "@/lib/uang";
import { catatKas } from "@/lib/kas";
import { catatAudit } from "@/lib/audit";
import { nomorBerikutnya } from "@/lib/nota";

export interface BuatPembayaranInput {
  arah: "VENDOR" | "CUSTOMER";
  partyId: string;
  nominal: number;
  catatan?: string;
  /** Kalau diisi, alokasi hanya ke nota-nota ini (tetap tertua dulu). */
  notaIds?: string[];
}

interface NotaTerbuka {
  id: string;
  nomor: string;
  sisa: bigint;
  tanggal: Date;
}

interface BarisNotaMentah {
  id: string;
  nomor: string;
  sisa: bigint | string | number;
  tanggal: Date;
}

/**
 * Nota terbuka DENGAN row lock — sama seperti lot pada penjualan (pasal 9).
 *
 * Tanpa `FOR UPDATE`, dua pelunasan yang tersimpan bersamaan sama-sama membaca
 * sisa hutang yang lama, lalu masing-masing menguranginya. Hasilnya nota
 * terbayar dua kali dan `sisaHutang` menjadi MINUS — persis yang dilarang
 * PRD A6 ("sisa hutang nota turun, tidak minus").
 *
 * Locknya diambil di sini, sebelum total tagihan dihitung, sehingga pemeriksaan
 * "nominal melebihi tagihan" dan pengurangannya berada di dalam kunci yang sama.
 */
async function notaTerbukaVendorTerkunci(tx: Tx, partyId: string): Promise<NotaTerbuka[]> {
  const rows = await tx.$queryRaw<BarisNotaMentah[]>`
    SELECT id, nomor, "sisaHutang" AS sisa, tanggal
    FROM purchases
    WHERE "vendorId" = ${partyId}
      AND status = 'AKTIF'
      AND cara = 'CREDIT'
      AND "sisaHutang" > 0
    ORDER BY tanggal ASC, nomor ASC
    FOR UPDATE
  `;
  return rows.map((r) => ({
    id: r.id,
    nomor: r.nomor,
    sisa: BigInt(r.sisa),
    tanggal: r.tanggal,
  }));
}

async function notaTerbukaCustomerTerkunci(tx: Tx, partyId: string): Promise<NotaTerbuka[]> {
  const rows = await tx.$queryRaw<BarisNotaMentah[]>`
    SELECT id, nomor, "sisaPiutang" AS sisa, tanggal
    FROM sales
    WHERE "customerId" = ${partyId}
      AND status = 'AKTIF'
      AND cara = 'CREDIT'
      AND "sisaPiutang" > 0
    ORDER BY tanggal ASC, nomor ASC
    FOR UPDATE
  `;
  return rows.map((r) => ({
    id: r.id,
    nomor: r.nomor,
    sisa: BigInt(r.sisa),
    tanggal: r.tanggal,
  }));
}

export async function buatPembayaran(input: BuatPembayaranInput, userId: string) {
  const nominal = rupiahDariInput(input.nominal, "Nominal pembayaran");
  if (nominal <= 0n) throw new AturanBisnisError("Nominal pembayaran harus lebih dari 0");

  return getPrisma().$transaction(async (tx) => {
    const party = await tx.party.findUnique({ where: { id: input.partyId } });
    if (!party) throw new AturanBisnisError("Pihak tidak ditemukan");

    const tipeDiharapkan = input.arah === "VENDOR" ? "VENDOR" : "CUSTOMER";
    if (party.tipe !== tipeDiharapkan) {
      throw new AturanBisnisError(`Pihak yang dipilih bukan ${tipeDiharapkan.toLowerCase()}`);
    }

    // Ambil kunci baris dulu, baru hitung. Semua pemeriksaan di bawah berlaku
    // atas angka yang sudah tidak bisa diubah transaksi lain sampai commit.
    const semuaNota =
      input.arah === "VENDOR"
        ? await notaTerbukaVendorTerkunci(tx, party.id)
        : await notaTerbukaCustomerTerkunci(tx, party.id);

    const batas = input.notaIds?.length ? new Set(input.notaIds) : null;
    const notas = batas ? semuaNota.filter((n) => batas.has(n.id)) : semuaNota;

    const totalTerbuka = notas.reduce((a, n) => a + n.sisa, 0n);

    if (totalTerbuka === 0n) {
      throw new AturanBisnisError(
        input.arah === "VENDOR"
          ? `Tidak ada hutang terbuka untuk ${party.nama}.`
          : `Tidak ada piutang terbuka untuk ${party.nama}.`
      );
    }

    // Uang hantu dilarang: kelebihan bayar ditolak, bukan disimpan diam-diam.
    if (nominal > totalTerbuka) {
      throw new AturanBisnisError(
        `Nominal melebihi total tagihan terbuka (Rp ${totalTerbuka.toLocaleString("id-ID")}). ` +
          `Kurangi nominalnya — kelebihan uang tidak disimpan sebagai saldo.`
      );
    }

    const nomor = await nomorBerikutnya(tx, "BY");
    const payment = await tx.payment.create({
      data: {
        nomor,
        arah: input.arah,
        partyId: party.id,
        createdById: userId,
        total: nominal,
        catatan: input.catatan?.trim() || null,
      },
    });

    // Alokasi FIFO nota: tertua dulu.
    let sisaUang = nominal;
    const rincian: { nomor: string; nominal: bigint }[] = [];

    for (const nota of notas) {
      if (sisaUang === 0n) break;
      const dipakai = sisaUang < nota.sisa ? sisaUang : nota.sisa;

      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          purchaseId: input.arah === "VENDOR" ? nota.id : null,
          saleId: input.arah === "CUSTOMER" ? nota.id : null,
          nominal: dipakai,
        },
      });

      if (input.arah === "VENDOR") {
        await tx.purchase.update({
          where: { id: nota.id },
          data: { sisaHutang: { decrement: dipakai } },
        });
      } else {
        await tx.sale.update({
          where: { id: nota.id },
          data: { sisaPiutang: { decrement: dipakai } },
        });
      }

      rincian.push({ nomor: nota.nomor, nominal: dipakai });
      sisaUang -= dipakai;
    }

    // PRD pasal 4.4: kas bergerak saat uang benar-benar pindah, bukan saat nota dibuat.
    await catatKas(tx, {
      jenis: "PAYMENT",
      arah: input.arah === "VENDOR" ? "KELUAR" : "MASUK",
      nominal,
      keterangan:
        input.arah === "VENDOR"
          ? `Bayar hutang ${party.nama} (${nomor})`
          : `Terima piutang ${party.nama} (${nomor})`,
      refTipe: "PAYMENT",
      refId: payment.id,
      userId,
    });

    await catatAudit(tx, {
      userId,
      aksi: "PAYMENT",
      entitas: "Payment",
      entitasId: payment.id,
      after: {
        nomor,
        arah: input.arah,
        pihak: party.nama,
        nominal,
        alokasi: rincian.map((r) => ({ nota: r.nomor, nominal: r.nominal })),
      },
      keterangan: `Pembayaran ${nomor}`,
    });

    return { payment, rincian };
  });
}

/** VOID pembayaran — owner saja. Mengembalikan sisa hutang/piutang dan kas. */
export async function voidPembayaran(paymentId: string, alasan: string, userId: string) {
  const alasanBersih = alasan?.trim();
  if (!alasanBersih) throw new AturanBisnisError("Void wajib menyebutkan alasan");

  return getPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${paymentId} FOR UPDATE`;

    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { allocations: true, party: true },
    });
    if (!payment) throw new AturanBisnisError("Pembayaran tidak ditemukan");
    if (payment.status === "VOID") throw new AturanBisnisError("Pembayaran ini sudah void");

    for (const alokasi of payment.allocations) {
      if (alokasi.purchaseId) {
        await tx.purchase.update({
          where: { id: alokasi.purchaseId },
          data: { sisaHutang: { increment: alokasi.nominal } },
        });
      }
      if (alokasi.saleId) {
        await tx.sale.update({
          where: { id: alokasi.saleId },
          data: { sisaPiutang: { increment: alokasi.nominal } },
        });
      }
      await tx.paymentAllocation.delete({ where: { id: alokasi.id } });
    }

    await catatKas(tx, {
      jenis: "VOID",
      arah: payment.arah === "VENDOR" ? "MASUK" : "KELUAR",
      nominal: payment.total,
      keterangan: `Void pembayaran ${payment.nomor}: ${alasanBersih}`,
      refTipe: "PAYMENT_VOID",
      refId: payment.id,
      userId,
    });

    const hasil = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "VOID", voidAt: new Date(), voidAlasan: alasanBersih },
    });

    await catatAudit(tx, {
      userId,
      aksi: "VOID",
      entitas: "Payment",
      entitasId: payment.id,
      before: { status: "AKTIF", total: payment.total },
      after: { status: "VOID" },
      keterangan: `Void pembayaran ${payment.nomor}: ${alasanBersih}`,
    });

    return hasil;
  });
}

/** Daftar nota terbuka untuk layar pelunasan (PRD pasal 6.3). */
export async function notaTerbuka(arah: "VENDOR" | "CUSTOMER", partyId: string) {
  const db = getPrisma();
  if (arah === "VENDOR") {
    return db.purchase.findMany({
      where: { vendorId: partyId, status: "AKTIF", cara: "CREDIT", sisaHutang: { gt: 0 } },
      orderBy: [{ tanggal: "asc" }],
      select: {
        id: true,
        nomor: true,
        tanggal: true,
        total: true,
        sisaHutang: true,
        jatuhTempo: true,
        tempoHari: true,
      },
    });
  }
  return db.sale.findMany({
    where: { customerId: partyId, status: "AKTIF", cara: "CREDIT", sisaPiutang: { gt: 0 } },
    orderBy: [{ tanggal: "asc" }],
    select: {
      id: true,
      nomor: true,
      tanggal: true,
      total: true,
      sisaPiutang: true,
      jatuhTempo: true,
      tempoHari: true,
    },
  });
}
