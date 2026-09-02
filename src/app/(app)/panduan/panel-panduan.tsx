/**
 * Panduan Pemakaian — dokumentasi yang hidup di dalam aplikasi.
 *
 * Isinya ada di isi-panduan.ts. Tab "Cakupan & Batasan" sengaja memuat daftar
 * hal yang TIDAK ada di V1 beserta cara kerja manualnya, supaya pertanyaan
 * "fitur ini di mana?" terjawab di dalam aplikasi, bukan lewat tebakan.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Rocket,
  Workflow,
  LayoutGrid,
  Calculator,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";
import { Card, CardJudul, Badge, Peringatan, Tabel, Th, Td } from "@/components/ui/dasar";
import { cn } from "@/lib/utils";
import {
  LANGKAH_AWAL,
  ALUR,
  HALAMAN,
  ATURAN_HITUNG,
  CAKUPAN,
  BATASAN,
  type Peran,
} from "./isi-panduan";

type Tab = "mulai" | "alur" | "halaman" | "hitung" | "cakupan";

const TABS: { key: Tab; label: string; icon: typeof Rocket }[] = [
  { key: "mulai", label: "Mulai Cepat", icon: Rocket },
  { key: "alur", label: "Alur Kerja", icon: Workflow },
  { key: "halaman", label: "Per Halaman", icon: LayoutGrid },
  { key: "hitung", label: "Aturan Hitung", icon: Calculator },
  { key: "cakupan", label: "Cakupan & Batasan", icon: ShieldCheck },
];

function LencanaPeran({ peran }: { peran: Peran }) {
  if (peran === "KEDUANYA") return <Badge nada="sukses">Owner &amp; Kasir</Badge>;
  if (peran === "OWNER") return <Badge nada="info">Owner</Badge>;
  return <Badge nada="netral">Kasir</Badge>;
}

/** Menu → Submenu → Tombol, ditampilkan sebagai jejak yang bisa diikuti. */
function Jalur({ bagian }: { bagian: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {bagian.map((b, i) => (
        <React.Fragment key={b}>
          {i > 0 && (
            <ChevronRight
              className="h-3 w-3 shrink-0 text-gray-500 dark:text-gray-400"
              aria-hidden
            />
          )}
          <span className="rounded border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-gray-200">
            {b}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

export function PanelPanduan({ role, nama }: { role: "OWNER" | "KASIR"; nama: string }) {
  const [tab, setTab] = React.useState<Tab>("mulai");
  const isOwner = role === "OWNER";

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Pusat Bantuan
        </p>
        <h1 className="mt-0.5 text-xl font-semibold text-gray-900 dark:text-gray-50">
          Panduan Pemakaian
        </h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          Semua yang perlu diketahui untuk menjalankan aplikasi ini sehari-hari.
        </p>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold">Satu kalimat tentang aplikasi ini</p>
            <p className="mt-1">
              Aplikasi ini mencatat stok dalam <strong>gram bulat dan iket</strong>, menghitung
              modal barang dengan <strong>FIFO per lot pembelian</strong>, dan menjaga{" "}
              <strong>kas hanya bergerak saat uang benar-benar berpindah</strong> — sehingga tiga
              pertanyaan ini selalu bisa dijawab: berapa stok nyata, berapa modal barang yang baru
              laku, dan berapa uang yang benar-benar ada.
            </p>
            {!isOwner && (
              <p className="mt-2">
                Anda masuk sebagai kasir, {nama}. Bagian bertanda{" "}
                <Badge nada="info">Owner</Badge> tetap ditampilkan supaya Anda tahu harus meminta
                apa ke owner, tapi menunya tidak terbuka untuk akun Anda.
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-gray-50 dark:hover:bg-zinc-700"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "mulai" && <TabMulai />}
      {tab === "alur" && <TabAlur />}
      {tab === "halaman" && <TabHalaman />}
      {tab === "hitung" && <TabHitung />}
      {tab === "cakupan" && <TabCakupan />}
    </div>
  );
}

// --------------------------------------------------------------------------

function TabMulai() {
  return (
    <div className="space-y-4">
      <Card>
        <CardJudul
          judul="Langkah pertama saat aplikasi baru dipasang"
          keterangan="Kerjakan berurutan. Semuanya dilakukan owner, sekali saja."
        />

        <Peringatan judul="Jangan berjualan sebelum langkah 3 dan 4 selesai">
          Tanpa stok awal, laporan stok menunjukkan angka yang bukan kenyataan. Tanpa saldo kas
          awal, saldo kas akan tampak minus begitu Anda mencatat pembelian pertama.
        </Peringatan>

        <ol className="mt-4 space-y-4">
          {LANGKAH_AWAL.map((l, i) => (
            <li key={l.judul} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white dark:bg-blue-500">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-gray-50">{l.judul}</p>
                  <LencanaPeran peran={l.peran} />
                </div>
                <div className="mt-1.5">
                  <Jalur bagian={l.jalur} />
                </div>
                <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">{l.penjelasan}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <CardJudul judul="Kebiasaan harian yang disarankan" />
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400">&bull;</span>
            <span>
              <strong className="text-gray-900 dark:text-gray-50">Setiap transaksi, saat itu juga.</strong>{" "}
              Nota yang dicatat belakangan hampir selalu salah qty.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400">&bull;</span>
            <span>
              <strong className="text-gray-900 dark:text-gray-50">Tutup toko:</strong> buka{" "}
              <Link href="/kas" className="text-blue-700 underline dark:text-blue-300">
                Kas
              </Link>
              , bandingkan saldo di layar dengan uang fisik di laci. Kalau beda, telusuri mutasinya
              hari itu. Ini dikerjakan manual — lihat tab Cakupan &amp; Batasan.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400">&bull;</span>
            <span>
              <strong className="text-gray-900 dark:text-gray-50">Setiap dua minggu:</strong> opname
              stok. Hitung fisik dulu sampai selesai, baru buka aplikasinya.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-gray-500 dark:text-gray-400">&bull;</span>
            <span>
              <strong className="text-gray-900 dark:text-gray-50">Sebelum mengambil uang:</strong>{" "}
              lihat saldo kas, bukan laba. Laba bisa jauh lebih besar dari uang yang benar-benar ada.
            </span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------------

function TabAlur() {
  return (
    <div className="space-y-3">
      {ALUR.map((a) => (
        <Card key={a.judul}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">{a.judul}</h2>
            <LencanaPeran peran={a.peran} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Menu {a.jalur}</span>
          </div>

          <ol className="space-y-1.5">
            {a.langkah.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-800 dark:text-gray-200">
                <span className="w-4 shrink-0 text-right font-medium text-gray-500 dark:text-gray-400">
                  {i + 1}.
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>

          {a.catatan && (
            <div className="mt-3">
              <Peringatan>{a.catatan}</Peringatan>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------

function TabHalaman() {
  return (
    <Card>
      <CardJudul
        judul="Setiap menu, untuk apa"
        keterangan="Menu bertanda Owner tidak muncul di akun kasir."
      />
      <Tabel>
        <thead>
          <tr>
            <Th>Menu</Th>
            <Th>Untuk apa</Th>
            <Th>Yang perlu diperhatikan</Th>
          </tr>
        </thead>
        <tbody>
          {HALAMAN.map((h) => (
            <tr key={h.menu}>
              <Td className="whitespace-nowrap align-top">
                <p className="font-semibold">{h.menu}</p>
                <div className="mt-1">
                  <LencanaPeran peran={h.peran} />
                </div>
              </Td>
              <Td className="align-top">{h.untukApa}</Td>
              <Td className="align-top text-gray-700 dark:text-gray-300">{h.perhatikan}</Td>
            </tr>
          ))}
        </tbody>
      </Tabel>
    </Card>
  );
}

// --------------------------------------------------------------------------

function TabHitung() {
  return (
    <div className="space-y-3">
      <Peringatan nada="info" judul="Kenapa bagian ini perlu dibaca">
        Angka di layar tidak bisa dipercaya kalau cara menghitungnya tidak dimengerti. Bagian ini
        menjelaskan aturan yang dipakai aplikasi, bukan aturan akuntansi pada umumnya.
      </Peringatan>

      {ATURAN_HITUNG.map((a) => (
        <Card key={a.judul}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">{a.judul}</h2>
          <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">{a.isi}</p>
          {a.contoh && (
            <p className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100">
              <span className="font-semibold">Contoh: </span>
              {a.contoh}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

// --------------------------------------------------------------------------

function TabCakupan() {
  return (
    <div className="space-y-4">
      <Card>
        <CardJudul
          judul="Kebutuhan sehari-hari, dikerjakan di mana"
          keterangan="Kalau sebuah kebutuhan tidak ada di tabel ini, kemungkinan besar ada di daftar batasan di bawah."
        />
        <Tabel>
          <thead>
            <tr>
              <Th>Transaksi / kebutuhan</Th>
              <Th>Dikerjakan di</Th>
              <Th>Siapa</Th>
            </tr>
          </thead>
          <tbody>
            {CAKUPAN.map((c) => (
              <tr key={c.kebutuhan}>
                <Td>{c.kebutuhan}</Td>
                <Td className="whitespace-nowrap font-medium">{c.dikerjakanDi}</Td>
                <Td>
                  <LencanaPeran peran={c.peran} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </Card>

      <Card>
        <CardJudul
          judul="Yang belum ada di V1"
          keterangan="Ditulis terbuka beserta cara menanganinya sekarang. Bukan daftar rencana."
        />

        <Peringatan judul="Kenapa ini penting dibaca">
          Semua yang ada di bawah memang tidak dibangun. Menambahkannya berarti mengubah kontrak
          V1, jadi bicarakan dulu sebelum ada yang menganggapnya bisa dipakai.
        </Peringatan>

        <div className="mt-4 space-y-3">
          {BATASAN.map((b) => (
            <div
              key={b.hal}
              className="rounded-lg border border-gray-200 p-3 dark:border-zinc-700"
            >
              <p className="font-semibold text-gray-900 dark:text-gray-50">{b.hal}</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Alasan: </span>
                {b.alasan}
              </p>
              <p className="mt-1.5 text-sm text-gray-800 dark:text-gray-200">
                <span className="font-medium">Sekarang ditangani begini: </span>
                {b.gantinya}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
