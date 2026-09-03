/**
 * Dashboard komprehensif — owner saja (PRD pasal 8: kasir → /kasir).
 *
 * Menampilkan: kartu ringkasan, grafik omzet/laba, produk terlaris,
 * stok menipis, aktivitas terakhir, hutang/piutang jatuh tempo.
 *
 * PRD pasal 10: peringatan kas WAJIB ditampilkan.
 */

import { redirect } from "next/navigation";
import { wajibLogin } from "@/lib/guard";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await wajibLogin();

  // PRD pasal 8: kasir punya satu layar jual, bukan dashboard akuntansi.
  if (user.role !== "OWNER") redirect("/kasir");

  return <DashboardClient />;
}
