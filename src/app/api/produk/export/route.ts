/**
 * Export produk ke XLSX / CSV — owner saja (PRD pasal 5).
 *
 * GET /api/produk/export?format=xlsx (default) atau ?format=csv
 */

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { withOwner } from "@/lib/api-helpers";
import { getPrisma } from "@/lib/prisma";

export const GET = withOwner(async (req) => {
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "xlsx";

  const db = getPrisma();
  const produk = await db.product.findMany({
    where: { aktif: true },
    orderBy: [{ nama: "asc" }, { merek: "asc" }],
  });

  const header = [
    "nama",
    "merek",
    "kategori",
    "satuanDasar",
    "namaSatuanBeli",
    "konversiBeli",
    "hargaJualDefault",
    "hargaJualPerQty",
  ];

  const dataRows = produk.map((p) => [
    p.nama,
    p.merek,
    p.kategori ?? "",
    p.satuanDasar,
    p.namaSatuanBeli,
    p.konversiBeli,
    p.hargaJualDefault,
    p.hargaJualPerQty,
  ]);

  const sheetData = [header, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set lebar kolom otomatis agar rapi saat dibuka di Excel
  ws["!cols"] = [
    { wch: 25 }, // nama
    { wch: 20 }, // merek
    { wch: 15 }, // kategori
    { wch: 12 }, // satuanDasar
    { wch: 15 }, // namaSatuanBeli
    { wch: 14 }, // konversiBeli
    { wch: 18 }, // hargaJualDefault
    { wch: 16 }, // hargaJualPerQty
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produk");

  if (format === "csv") {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="produk.csv"',
      },
    });
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="produk.xlsx"',
    },
  });
});
