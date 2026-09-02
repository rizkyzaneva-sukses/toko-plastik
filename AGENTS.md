# AGENTS.md — Aturan Project

Dibaca otomatis oleh Antigravity, Kilo Code, Roo Code, dan Claude Code.
Isinya ringkasan `App-Builder` — kalau bertentangan dengan tebakanmu, file ini
yang menang.

**Untuk project ini, bagian "Kontrak PRD" di bawah menang di atas segalanya,
termasuk di atas aturan App-Builder yang generik.**

---

## Aturan nol

**Jangan menebak. Kalau ada yang tidak jelas, tanya dulu.**
Rumus bisnis, nama field, hak akses, sumber data — tidak boleh dikarang.
Lebih baik berhenti dan bertanya daripada membangun yang salah.

Jangan menandai pekerjaan "selesai" kalau ada bagian yang belum jalan.
Tulis terus terang apa yang belum beres.

## Setup awal (Antigravity)

**STEP 1 selalu:** Folder sudah di-extract manual oleh user. **JANGAN extract ZIP.**
Langsung `cd` ke folder, lalu `npm install`.

## Stack — jangan diganti tanpa izin

Next.js 16 (App Router) · React 19 · **TypeScript** · Tailwind v4 ·
Prisma 7 + `@prisma/adapter-pg` · PostgreSQL · iron-session 8 ·
Radix UI + cmdk + lucide-react + sonner

Tidak dipakai: JavaScript polos, Pages Router, Express, NextAuth, next-themes,
Server Actions (pakai Route Handlers), `tailwind.config.js` (Tailwind v4 pakai CSS).

## UI — wajib

1. **Tema light + dark**, default ikut OS, ada toggle 3 state (light/dark/system).
   Inline script anti-FOUC di `<head>` tidak boleh dihapus.
2. **Kontras WCAG AA 4.5:1.** Setiap kelas teks wajib punya pasangan `dark:`.
   Dilarang: `text-gray-400` untuk teks isi, teks putih di atas warna muda.
3. **Semua dropdown pakai `<SearchableSelect>`** — berapa pun jumlah opsinya.
   `<select>` polos dan Radix Select telanjang tidak dipakai.
4. Setiap halaman data punya: loading skeleton, empty state, error state, toast.
5. Dites di lebar 375px. Tabel dibungkus `overflow-x-auto`.
6. Konfirmasi sebelum menghapus. Tidak pernah `alert()` — pakai `sonner`.

## Bahasa & format

Label Bahasa Indonesia. Istilah bisnis baku **tetap Inggris**:
Dashboard, Omzet, Profit, Cash Flow, Stock Opname, SKU, ROAS, ROI, GMV, Payout,
Voucher, Checkout, Campaign, Report, Export, Import, Sync, Barcode, Refund.

`Rp 1.250.000` (tanpa desimal) · `20 Agu 2026` · timezone tampilan **WIB**,
penyimpanan DB **UTC**. Semua formatter di `src/lib/utils.ts`, jangan inline.

## Database

- `id String @id @default(cuid())` + `createdAt` + `updatedAt` di setiap model
- Uang: **`BigInt` Rupiah bulat** di project ini — lihat bagian Kontrak PRD.
  (Aturan generik App-Builder `Decimal(15,2)` SENGAJA tidak dipakai di sini.)
- Status: `enum`, bukan String bebas
- Index untuk kolom yang sering difilter
- Produksi pakai `prisma migrate deploy`, **jangan** `db push`
- Seed harus idempoten (`upsert`)

## Auth

- Session di cookie httpOnly terenkripsi (iron-session), bukan localStorage
- **Role dibaca fresh dari DB tiap request**, tidak pernah dari isi cookie
- Setiap route handler dibungkus `withAuth` / `withRole` — middleware saja tidak cukup
- Otorisasi diperiksa **sebelum** cookie dibuat
- Rate limit di endpoint login; pesan gagal login generik

## Keamanan

- Kredensial tidak pernah masuk repo. Hanya `.env.example` berisi nama key.
- Token pihak ketiga disimpan di DB (bukan env), sebaiknya terenkripsi
- Jangan `console.log` isi token, password, atau data pribadi

## Struktur folder

```
src/
├── app/{api,(modul),login,layout.tsx,globals.css}
├── components/{layout,ui}
├── lib/{prisma,session,api-helpers,utils,<domain>}.ts
├── generated/prisma/     (gitignored)
└── middleware.ts
```

**Logika bisnis di `src/lib/<domain>.ts`, bukan di dalam route handler.**

## Sebelum bilang selesai

- [ ] `npm run build` lulus tanpa error TypeScript
- [ ] Toggle tema dicoba: tidak ada teks yang hilang di salah satu mode
- [ ] Semua dropdown pakai `SearchableSelect`
- [ ] Dicoba di lebar 375px
- [ ] `.env.example` lengkap
- [ ] Yang belum selesai ditulis terbuka

---

## Kontrak PRD — pasal yang tidak boleh disentuh

Sumbernya `PRD-Toko-Plastik-Bahan-Kue-V1.docx`. Kutipan penutupnya:
*"Kode yang menyimpang dari pasal 4 dianggap cacat, bukan improvisasi."*

Kalau sebuah permintaan bertabrakan dengan daftar di bawah, **berhenti dan
tanya**. Jangan "sesuaikan di kode saja" — yang harus direvisi PRD-nya.

1. **Satuan (pasal 4.1).** Tidak ada kg desimal. Gram bulat, iket, pcs.
   Database hanya integer. `parseQtyDasar()` di `src/lib/satuan.ts` adalah satu-
   satunya gerbang; jangan bikin jalur input qty yang melewatinya.
2. **Uang (pasal 7).** `BigInt` Rupiah bulat. Tidak ada `Float`, tidak ada
   desimal rupiah. Harga per-gram diwakili `harga per N satuan`
   (`hargaJualDefault` + `hargaJualPerQty`), bukan pembagian floating point.
3. **FIFO (pasal 4.2).** Penjualan, susut, rusak, dan opname kurang selalu
   memotong lot tertua lewat `potongStokFifo()`. Setiap konsumsi lot WAJIB
   tersimpan di `sale_lot_consumptions` / `adjustment_lot_consumptions` —
   tanpa itu FIFO tidak auditable.
4. **Ongkir/kuli bukan HPP (pasal 4.2).** Biaya operasional masuk kas keluar,
   tidak pernah menempel ke lot.
5. **Stok tidak boleh minus (pasal 4.3).** Kurang stok = seluruh nota ditolak,
   bukan disimpan sebagian.
6. **Tidak ada retur (pasal 4.3).** Koreksi hanya lewat void owner atau
   penyesuaian stok beralasan.
7. **Tidak ada hapus fisik (pasal 7).** Status `VOID` pada nota,
   soft-nonaktif pada master.
8. **Kas hanya bergerak kalau uang pindah (pasal 4.4).** Hanya `catatKas()` di
   `src/lib/kas.ts` yang boleh menulis ke tabel kas, dan wajib menyebut asalnya.
9. **Pinjaman owner, bukan bagi laba (pasal 4.4).** Jatah 50% margin DIBATALKAN.
   Dilarang menambahkan perhitungan "berapa yang boleh diambil owner".
10. **Laporan laba wajib memuat peringatan kas (pasal 10).** Konstanta
    `PERINGATAN_LABA` di `src/lib/laporan.ts` tidak boleh dihapus dari UI.
11. **Void, opname, master, audit = owner saja (pasal 3, A10).**
    Audit log tidak dibuka ke kasir.
12. **Ubah konversi tidak menghitung ulang barang lama (pasal 13).**
    Konversi disalin ke `PurchaseItem.konversiSaat` saat nota dibuat.

### Yang sengaja TIDAK ada di V1 (pasal 5 & 15)

Struk thermal, PPN/PKP, retur, promo, expired, harga grosir otomatis, tutup buku
formal, persen jatah owner, mode offline, multi-cabang, multi-kas.
Menambahkannya butuh revisi PRD lebih dulu.

### Jebakan yang sudah pernah menggigit di project ini

Semua sudah ditutup uji regresi. Jangan buat ulang polanya:

1. **HPP tidak cukup disembunyikan di layar.** Kasir bisa membuka Network tab.
   Buang field HPP **di server** berdasarkan role, seperti `/api/produk` dan
   `/api/penjualan/[id]` sekarang.
2. **Setiap angka yang dikurangi butuh row lock.** Lot penjualan sudah pakai
   `FOR UPDATE` sejak awal, tapi pelunasan terlewat dan membuat `sisaHutang`
   jadi −200.000. Kalau menambah jalur yang mengurangi saldo apa pun, kunci
   barisnya dulu.
3. **Jangan pernah pakai `new Date("YYYY-MM-DD")` atau `setHours(0,0,0,0)`
   untuk batas hari.** Container berjalan `TZ=UTC`; pakai `src/lib/waktu.ts`.
   Bug ini tidak terlihat sama sekali saat diuji di laptop ber-WIB.
4. **Error input user tidak boleh jatuh sebagai 500.** Lempar
   `AturanBisnisError` dari `src/lib/errors.ts`, jangan `new Error(...)`.
5. **Uji dengan `TZ=UTC`**, bukan zona waktu laptop.

### Sebelum bilang selesai di project ini

- [ ] `npm run build` lulus
- [ ] `npm test` lulus (FIFO, satuan, uang, batas hari WIB)
- [ ] `npm run test:e2e` lulus 116/116 terhadap database uji, server `TZ=UTC`
