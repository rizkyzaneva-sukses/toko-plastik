/**
 * Import produk dari Excel (XLSX/XLS) atau CSV — owner saja (PRD pasal 5).
 *
 * POST /api/produk/import
 * Body: FormData dengan field "file".
 */

import * as XLSX from "xlsx";
import { withOwner, ok, AturanBisnisError } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";
import { catatAuditLepas } from "@/lib/audit";
import { validasiProduk } from "../route";

interface HasilImport {
  berhasil: number;
  duplikat: number;
  gagal: { baris: number; pesan: string }[];
}

export const POST = withOwner(async (req, user) => {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    throw new AturanBisnisError("File Excel/CSV wajib dikirim");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new AturanBisnisError("Ukuran file maksimal 5 MB");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    throw new AturanBisnisError(
      "Format file tidak valid. Pastikan file berformat Excel (.xlsx, .xls) atau CSV."
    );
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new AturanBisnisError("File Excel kosong (tidak ada worksheet)");
  }

  const ws = wb.Sheets[sheetName];
  const baris = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

  if (baris.length < 2) {
    throw new AturanBisnisError("File harus punya minimal 1 baris data produk selain header.");
  }

  // Header row
  const headerRaw = (baris[0] as unknown[]).map((h) => String(h ?? "").toLowerCase().trim());
  const namaIdx = headerRaw.indexOf("nama");
  const merekIdx = headerRaw.indexOf("merek");
  const kategoriIdx = headerRaw.indexOf("kategori");
  const satuanDasarIdx = headerRaw.indexOf("satuandasar");
  const namaSatuanBeliIdx = headerRaw.indexOf("namasatuanbeli");
  const konversiBeliIdx = headerRaw.indexOf("konversibeli");
  const hargaJualDefaultIdx = headerRaw.indexOf("hargajualdefault");
  const hargaJualPerQtyIdx = headerRaw.indexOf("hargajualperqty");

  if (namaIdx === -1 || merekIdx === -1) {
    throw new AturanBisnisError(
      "Header file harus memuat minimal kolom 'nama' dan 'merek'. Silakan unduh template."
    );
  }

  const db = getPrisma();
  const hasil: HasilImport = { berhasil: 0, duplikat: 0, gagal: [] };

  for (let i = 1; i < baris.length; i++) {
    const kol = (baris[i] as unknown[]) || [];
    if (!kol || kol.length === 0 || kol.every((k) => k === undefined || k === null || String(k).trim() === "")) {
      continue; // Baris kosong diabaikan
    }

    try {
      const body = {
        nama: kol[namaIdx] !== undefined ? String(kol[namaIdx]).trim() : "",
        merek: kol[merekIdx] !== undefined ? String(kol[merekIdx]).trim() : "",
        kategori: kategoriIdx >= 0 && kol[kategoriIdx] !== undefined ? String(kol[kategoriIdx]).trim() : "",
        satuanDasar:
          satuanDasarIdx >= 0 && kol[satuanDasarIdx] !== undefined
            ? String(kol[satuanDasarIdx]).trim().toUpperCase()
            : "PCS",
        namaSatuanBeli:
          namaSatuanBeliIdx >= 0 && kol[namaSatuanBeliIdx] !== undefined
            ? String(kol[namaSatuanBeliIdx]).trim()
            : "pcs",
        konversiBeli:
          konversiBeliIdx >= 0 && kol[konversiBeliIdx] !== undefined
            ? Math.round(Number(kol[konversiBeliIdx])) || 1
            : 1,
        hargaJualDefault:
          hargaJualDefaultIdx >= 0 && kol[hargaJualDefaultIdx] !== undefined
            ? Math.round(Number(kol[hargaJualDefaultIdx])) || 0
            : 0,
        hargaJualPerQty:
          hargaJualPerQtyIdx >= 0 && kol[hargaJualPerQtyIdx] !== undefined
            ? Math.round(Number(kol[hargaJualPerQtyIdx])) || 1
            : 1,
      };

      const data = validasiProduk(body);

      // Cek apakah produk sudah ada (nama + merek unik di schema)
      const ada = await db.product.findFirst({
        where: { nama: data.nama, merek: data.merek },
      });

      if (ada) {
        hasil.duplikat++;
        continue;
      }

      const produk = await db.product.create({ data });

      await catatAuditLepas({
        userId: user.id,
        aksi: "CREATE",
        entitas: "Product",
        entitasId: produk.id,
        after: produk,
        keterangan: `Import file: ${produk.nama} ${produk.merek}`,
      });

      hasil.berhasil++;
    } catch (e) {
      hasil.gagal.push({
        baris: i + 1,
        pesan: e instanceof Error ? e.message : "Data tidak valid",
      });
    }
  }

  return ok({ hasil });
});
