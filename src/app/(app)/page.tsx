import { redirect } from "next/navigation";
import Link from "next/link";
import { wajibLogin } from "@/lib/guard";
import { ringkasan } from "@/lib/laporan";
import { Card, Peringatan, Tombol } from "@/components/ui/dasar";
import { formatRupiah } from "@/lib/utils";
import { ShoppingCart, Store, HandCoins } from "lucide-react";

export const dynamic = "force-dynamic";

function Angka({
  label,
  nilai,
  keterangan,
  nada,
}: {
  label: string;
  nilai: number;
  keterangan?: string;
  nada?: "baik" | "waspada";
}) {
  return (
    <Card>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p
        className={
          nada === "waspada" && nilai > 0
            ? "mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300"
            : "mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50"
        }
      >
        {formatRupiah(nilai)}
      </p>
      {keterangan && (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{keterangan}</p>
      )}
    </Card>
  );
}

export default async function Dashboard() {
  const user = await wajibLogin();

  // PRD pasal 8: kasir punya satu layar jual, bukan dashboard akuntansi.
  if (user.role !== "OWNER") redirect("/kasir");

  const r = await ringkasan();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          Empat angka wajib: stok, kas, hutang/piutang, laba kotor.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Angka
          label="Saldo Kas"
          nilai={r.saldoKas}
          keterangan="Uang yang benar-benar ada, setelah hutang dan pinjaman owner."
        />
        <Angka
          label="Nilai Stok (HPP)"
          nilai={r.nilaiStok}
          keterangan="Jumlah sisa nilai semua lot FIFO."
        />
        <Angka
          label="Piutang Customer"
          nilai={r.totalPiutang}
          keterangan="Uang yang belum masuk."
          nada="waspada"
        />
        <Angka
          label="Hutang Vendor"
          nilai={r.totalHutang}
          keterangan="Uang yang belum dibayar."
          nada="waspada"
        />
        <Angka
          label="Pinjaman Owner"
          nilai={r.pinjamanOwner}
          keterangan="Utang owner ke toko. Bukan pembagian laba."
          nada="waspada"
        />
        <Angka
          label="Omzet Hari Ini"
          nilai={r.omzetHariIni}
          keterangan={`Laba kotor hari ini ${formatRupiah(r.labaKotorHariIni)}`}
        />
      </div>

      <Peringatan judul="Laba bukan izin menarik uang">
        Laba kotor bisa lebih besar dari kas karena sebagian sudah berubah menjadi stok dan
        piutang. Yang boleh diambil dibatasi saldo kas, dan setiap penarikan tercatat sebagai
        pinjaman owner.
      </Peringatan>

      <div className="flex flex-wrap gap-2">
        <Link href="/kasir">
          <Tombol>
            <ShoppingCart className="h-4 w-4" />
            Buka layar jual
          </Tombol>
        </Link>
        <Link href="/beli">
          <Tombol varian="sekunder">
            <Store className="h-4 w-4" />
            Catat pembelian
          </Tombol>
        </Link>
        <Link href="/hutang-piutang">
          <Tombol varian="sekunder">
            <HandCoins className="h-4 w-4" />
            Hutang / Piutang
          </Tombol>
        </Link>
      </div>
    </div>
  );
}
