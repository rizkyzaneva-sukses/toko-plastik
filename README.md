# Toko Plastik & Bahan Kue — V1

Implementasi dari `PRD-Toko-Plastik-Bahan-Kue-V1.docx`.
Prioritas plastik. Stok FIFO. Kas nyata. Tanpa retur. Tanpa kg desimal.

Dokumen PRD adalah kontrak. Kode yang menyimpang dari **pasal 4** dianggap cacat,
bukan improvisasi. Kalau ada yang perlu diubah di pasal 4, revisi PRD-nya dulu.

---

## Jalan lokal

```bash
npm install
cp .env.example .env        # isi DATABASE_URL dan SESSION_SECRET
npm run db:deploy           # jalankan migrasi
npm run db:seed             # buat user owner, kasir, dan record UMUM
npm run dev                 # http://localhost:3000
```

Login awal dari seed:

| Username | Password   | Role  |
|----------|------------|-------|
| `owner`  | `admin123` | OWNER |
| `kasir`  | `kasir123` | KASIR |

Ganti kedua password lewat menu setelah login pertama, atau isi
`SEED_OWNER_PASSWORD` / `SEED_KASIR_PASSWORD` sebelum seed.

Generate `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi (`prisma generate` + `next build`) |
| `npm test` | Uji logika FIFO & satuan (Vitest, tanpa database) |
| `npm run test:e2e` | Uji penerimaan A1–A14 terhadap server + database nyata |
| `npm run db:migrate` | Buat migrasi baru saat schema berubah |
| `npm run db:deploy` | Terapkan migrasi di produksi |
| `npm run db:seed` | Seed idempoten |
| `npm run db:studio` | Prisma Studio |

---

## Cara aturan PRD diterjemahkan ke kode

Kalau nanti perlu mengubah perilaku, ubah di file yang tepat — jangan menambal
di route handler.

| Pasal PRD | Isi | File |
|---|---|---|
| 4.1 | Satuan gram/iket/pcs, larangan desimal | `src/lib/satuan.ts` |
| 4.2 | FIFO, HPP per lot | `src/lib/fifo.ts` (murni) + `src/lib/stok.ts` (database) |
| 4.3 | Beli/jual, cash/kredit, void | `src/lib/pembelian.ts`, `src/lib/penjualan.ts` |
| 4.4 | Kas & pinjaman owner | `src/lib/kas.ts`, `src/lib/pinjaman.ts` |
| 4.5 | Susut, rusak, opname | `src/lib/penyesuaian.ts` |
| 6.3 | Alokasi bayar ke nota tertua | `src/lib/pembayaran.ts` |
| 7 | Audit log | `src/lib/audit.ts` |
| 10 | Laporan + peringatan laba | `src/lib/laporan.ts` |
| 3 / A10 | Hak akses owner vs kasir | `src/lib/api-helpers.ts`, `src/lib/guard.tsx` |

Semua uang `BigInt` (Rupiah bulat), semua qty `Int`. Tidak ada `Float` sama
sekali untuk stok maupun uang.

### Satu penyimpangan yang disengaja dari pasal 7

PRD menulis `stock_lots` menyimpan `hpp_per_unit`. Itu mustahil sebagai integer
Rupiah: gula Rp 13.500/kg = Rp 13,5 per gram, dan menyimpan per-unit memaksa
pembulatan yang bocor beberapa rupiah tiap transaksi.

Yang disimpan: **`hppTotalAwal` + `hppSisa` (BigInt)** berdampingan dengan
`qtyAwal` + `qtySisa` (Int).

- HPP per unit tetap bisa **ditampilkan** sebagai `hppSisa / qtySisa`.
- Nilai stok pasal 10 = jumlah `hppSisa` — persis, tanpa selisih.
- Saat sebuah lot habis, HPP yang dikonsumsi = seluruh `hppSisa`, jadi tidak
  pernah ada rupiah nyangkut.

Contoh wajib pasal 4.2 tetap lolos identik, diuji di `tests/fifo.test.ts` (A3).

Harga jual mengikuti pola yang sama: disimpan sebagai `hargaJualDefault` rupiah
per `hargaJualPerQty` satuan dasar (Rp 13.500 per 1.000 g), bukan per gram.

### Nilai HPP untuk penambahan stok saat opname

PRD tidak mengunci ini. Aturan yang dipakai, dan ditulis di layar:
kelebihan fisik dinilai memakai **HPP rata-rata stok yang masih ada**. Kalau
produk sedang kosong sama sekali, owner **wajib** mengisi taksiran HPP —
sistem menolak menebak sendiri.

---

## Hak akses

| | Owner | Kasir |
|---|---|---|
| Jual (cash/kredit) | ya | ya |
| Lihat stok | ya, dengan nilai HPP | ya, **tanpa** nilai HPP |
| Terima pelunasan piutang | ya | ya |
| Bayar hutang vendor | ya | tidak |
| Pembelian / tentukan HPP | ya | tidak |
| Void nota | ya | tidak |
| Penyesuaian & opname | ya | tidak |
| Kas, pinjaman owner, Report | ya | tidak |
| Master barang & konversi | ya | tidak |
| Audit log | ya | tidak |
| Panduan Pemakaian | ya | ya |

Role dibaca **fresh dari database setiap request**, bukan dari isi cookie —
pencabutan hak berlaku seketika. Middleware hanya lapis pertama; setiap route
handler tetap dibungkus `withAuth` / `withOwner`.

---

## Panduan Pemakaian di dalam aplikasi

Menu **Panduan** (terbuka untuk owner dan kasir) berisi dokumentasi pemakaian
sehari-hari, dalam lima tab:

| Tab | Isi |
|---|---|
| Mulai Cepat | Tujuh langkah go-live berurutan + kebiasaan harian yang disarankan |
| Alur Kerja | Sembilan alur utama, langkah demi langkah: jual tunai, jual kredit, belanja, terima cicilan, bayar vendor, biaya, ambil uang owner, opname, void |
| Per Halaman | Setiap menu: untuk apa, siapa yang boleh, dan apa yang perlu diperhatikan |
| Aturan Hitung | Sebelas aturan perhitungan berikut contoh angkanya (satuan, FIFO, harga per satuan referensi, kas, laba, WIB) |
| Cakupan & Batasan | Tabel "kebutuhan → dikerjakan di menu mana", **plus daftar terbuka hal yang belum ada di V1** beserta cara menanganinya secara manual |

Isinya ada di `src/app/(app)/panduan/isi-panduan.ts`, terpisah dari tata letak
supaya gampang dikoreksi.

**Aturan menulis di file itu:** panduan harus menggambarkan apa yang aplikasi
ini benar-benar lakukan. Kalau sebuah fitur tidak ada, tulis di daftar
"Belum ada di V1" beserta cara kerja manualnya — jangan dijanjikan. Panduan yang
menyebut fitur yang tidak ada lebih berbahaya daripada tidak ada panduan.

### Rekonsiliasi kas harian: tidak ada, dan itu disengaja

Pertanyaan ini sudah muncul, jadi ditulis di sini dan di dalam aplikasi.
PRD V1 tidak pernah mengunci pemeriksaan laci harian — yang dikunci hanya opname
**stok** dua mingguan (pasal 4.5). Yang tersedia sekarang: buka menu **Kas**,
bandingkan saldo di layar dengan uang fisik di laci, lalu telusuri mutasi hari
itu kalau berbeda.

Aplikasi sengaja **tidak** menyediakan tombol untuk menyimpan selisih laci.
Alasannya sejalan dengan pasal 4.5 untuk stok: selisih yang bisa disimpan
sekali klik akan diserap diam-diam tanpa pernah dicari sebabnya. Kalau modul ini
memang diinginkan, itu perubahan pasal 4.4 dan butuh revisi PRD lebih dulu —
bukan ditambahkan diam-diam ke V1.

---

## Go-live (PRD pasal 12)

Go-live tanpa stok awal = stok palsu. Urutannya:

1. **Master barang** — Menu Master > Barang. Isi nama, merek, satuan dasar,
   dan konversi (1 karung = berapa gram, plastik konversi 1).
2. **Vendor & customer** — Menu Master > Vendor & Customer. `UMUM` sudah ada
   dari seed untuk retail cash.
3. **Stok awal** — Menu Stok > Stok awal. Qty dari hasil **opname fisik hari
   go-live**; HPP boleh taksiran. Qty harus tepat, HPP tidak perlu sempurna.
4. **Saldo kas awal** — Menu Kas. Hitung uang fisik di laci. Hanya bisa sekali.
5. **Hutang vendor terbuka** — catat sebagai pembelian kredit dengan tempo dan
   nominal sisa yang sebenarnya.
6. **Piutang B2B terbuka** — catat sebagai penjualan kredit, kalau ada.
7. **Ganti password** owner dan kasir.

---

## Status pengujian

Semua dijalankan pada 2 September 2026, Next.js 16.2.12, PostgreSQL 18.

| Uji | Hasil |
|---|---|
| `npm run build` | Lulus, tanpa error TypeScript |
| `npm test` (35 uji) | Lulus — FIFO, satuan, aritmetika uang, batas hari WIB |
| `npm run test:e2e` (116 uji) | Lulus — A1 s/d A14 + 13 uji regresi, terhadap database nyata |
| UI 375px, tema terang & gelap | Diperiksa manual, tidak ada teks hilang |

Uji e2e dijalankan dengan server `TZ=UTC`, sama seperti container EasyPanel —
bukan dengan zona waktu laptop. Ini penting: satu bug di bawah hanya muncul
kalau server tidak berjalan di WIB.

Menjalankan uji penerimaan:

```bash
npm run test:e2e -- http://127.0.0.1:3000
```

Skrip itu **menulis data**. Arahkan ke database uji, jangan ke produksi.

---

## Yang sengaja TIDAK dikerjakan (PRD pasal 5 & 15)

Struk thermal, PPN/PKP, retur, promo, expired date, harga grosir otomatis,
tutup buku bulanan formal, persen jatah owner, mode offline, multi-cabang,
multi-kas, dan rekonsiliasi kas harian. Jangan diselundupkan ke V1 tanpa revisi PRD.

Daftar lengkapnya, beserta cara menangani tiap hal secara manual, ada di menu
**Panduan → Cakupan & Batasan** di dalam aplikasi.

Khususnya: **jatah 50% margin dibatalkan** dan diganti pinjaman owner. Tidak ada
satu pun perhitungan "berapa yang boleh diambil owner" di dalam kode.

## Bug yang ditemukan saat debug dan sudah diperbaiki

Semuanya sudah ditutup uji regresi otomatis (`RG1`–`RG9` di `npm run test:e2e`,
dan `tests/waktu.test.ts`). Ditulis di sini supaya tidak diulang.

| # | Bug | Akibat kalau dibiarkan | Perbaikan |
|---|---|---|---|
| 1 | **HPP bocor ke kasir lewat API.** Layar sudah menutupi, tapi `/api/produk`, `/api/penjualan`, dan `/api/penjualan/[id]` tetap mengirim `stokNilai`, `hppTotal`, `hpp`, dan konsumsi lot. `/api/pembayaran/nota-terbuka?arah=VENDOR` juga membuka hutang vendor. | Melanggar pasal 3 & A10. Siapa pun yang membuka Network tab di HP kasir bisa melihat modal seluruh barang. | HPP dibuang **di server** berdasarkan role, bukan disembunyikan di layar. Endpoint hutang vendor jadi owner-only. |
| 2 | **Sisa hutang bisa MINUS.** Dua pelunasan yang tersimpan bersamaan sama-sama membaca sisa hutang lama lalu masing-masing menguranginya. Terbukti: hutang Rp 100.000 dibayar 3x Rp 100.000, `sisaHutang` jadi −200.000 dan kas turun Rp 300.000. | Melanggar A6 ("tidak minus"). Kas toko berkurang untuk hutang yang sudah lunas. Jalur penjualan aman karena sudah pakai row lock; jalur pembayaran terlewat. | `SELECT ... FOR UPDATE` pada nota terbuka sebelum total dihitung, **plus** CHECK constraint di database sebagai lapis kedua. |
| 3 | **Batas hari laporan meleset 7 jam.** Container berjalan `TZ=UTC`, jadi "hari ini" dimulai pukul 07:00 WIB. | Semua penjualan antara 00:00–07:00 WIB masuk ke hari yang salah di Dashboard, Report, dan mutasi Kas. **Tidak terlihat sama sekali saat diuji di laptop yang zona waktunya sudah WIB.** | `src/lib/waktu.ts` dengan offset +07:00 eksplisit, dipakai semua laporan dan penomoran nota. |
| 4 | `npm run db:seed` gagal di lokal karena Prisma 7 tidak lagi memuat `.env`. | Perintah yang tertulis di README tidak jalan. | Seed memuat `.env` sendiri lewat `process.loadEnvFile`. |
| 5 | Qty beli sangat besar (100.000 karung x 50.000 g) melewati batas kolom `INT4` dan jatuh sebagai **500**. | Owner salah ketik satu angka, layar cuma bilang "kesalahan di server". | Batas `BATAS_QTY` diperiksa lebih dulu, pesan menyebut angkanya. |
| 6 | **Jual dengan harga Rp 0 diterima.** | Barang keluar tanpa uang dan tanpa alasan tertulis — persis lubang yang pasal 2.2 tutup dengan melarang promo/bonus. | Ditolak, diarahkan ke Penyesuaian Stok supaya masuk kerugian stok, bukan omzet Rp 0. |
| 7 | Harga negatif, cara bayar ngawur, dan barang kembar yang tersimpan bersamaan sama-sama jatuh sebagai **500**. | User melihat "Terjadi kesalahan di server" untuk kesalahan yang sebenarnya milik dia sendiri. | `apiError()` menerjemahkan error Prisma (P2002/P2003/P2025/validasi enum) menjadi 400 berpesan; `AturanBisnisError` dipindah ke `src/lib/errors.ts` supaya lapisan murni ikut memakainya. |
| 8 | **Pembelian bertanggal masa depan diterima.** | Urutan FIFO ikut `purchasedAt`, jadi lot bertanggal 2030 duduk di ekor antrian selamanya dan tidak pernah terpotong walau barangnya sudah di rak. | Tanggal di masa depan ditolak. |
| 9 | Void nota bisa berbenturan dengan pelunasan yang berjalan bersamaan. | Nota ter-void padahal uangnya baru saja masuk. | Baris nota dikunci `FOR UPDATE` di awal transaksi void. |
| 10 | Map rate-limit login tumbuh tanpa batas selama proses hidup. | Kebocoran memori kecil. | Catatan kedaluwarsa dibuang berkala. |

Yang **sudah benar sejak awal** dan ikut diverifikasi ulang: FIFO di bawah
6 penjualan serentak tidak pernah oversell, nota 40 baris tidak kena batas waktu
transaksi, void nota yang sudah dicicil ditolak, dan opname yang bersamaan
dengan penjualan tidak menghasilkan stok mustahil.

### Invarian yang kini dijaga database, bukan hanya kode

Migrasi `20260903000000_invarian_tidak_minus` menambahkan CHECK constraint:
sisa hutang/piutang tidak boleh minus atau melebihi total nota, `qtySisa` dan
`hppSisa` lot tidak boleh minus atau melebihi nilai awal, dan semua nominal uang
harus positif. Kalau suatu saat ada kode baru yang keliru, database menolaknya —
tidak tersimpan diam-diam.

## Catatan teknis yang belum beres

- **Ikon PWA** di `public/icons/` masih kotak biru polos hasil generate, bukan
  logo toko. Ganti dengan PNG 192px dan 512px yang sebenarnya sebelum dipasang
  di home screen HP.
- **Rate limit login** disimpan di memori proses. Cukup untuk satu container
  seperti sekarang; kalau nanti App di-scale lebih dari satu instance, pindahkan
  ke Redis atau tabel database.
- **`src/middleware.ts`** memakai konvensi yang ditandai deprecated oleh Next 16
  (peringatan muncul saat build). Masih berfungsi penuh; migrasi ke `proxy.ts`
  ditunda supaya tidak mengubah lapisan auth di akhir pengerjaan.

## Deploy

Lihat [DEPLOY_EASYPANEL.md](DEPLOY_EASYPANEL.md).
