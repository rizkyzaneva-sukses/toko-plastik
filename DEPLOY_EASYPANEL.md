# Deploy ke EasyPanel

Target: `https://tokoplastikdeni.gampangin.biz.id` · Port container **3000**.

PRD pasal 13 mewajibkan **Postgres sebagai service terpisah**, bukan satu
container dengan App — supaya restart dan rebuild App tidak pernah menyentuh data.

---

## 1. Service PostgreSQL

EasyPanel → Project → **Services → New Service → PostgreSQL**.

- Nama service: `tokoplastik-db`
- Catat: host internal, port `5432`, user, password, nama database
- **Volumes → aktifkan**, lalu **Backups → jadwalkan harian**

Backup terjadwal bukan opsional. Ini satu-satunya pengaman kalau data rusak.

## 2. Push ke GitHub

```bash
git init
git add .
git commit -m "Toko Plastik & Bahan Kue V1"
git branch -M main
git remote add origin git@github.com:<user>/toko-plastik.git
git push -u origin main
```

`.env` sudah masuk `.gitignore`. Jangan pernah commit kredensial.

## 3. Service App

**New Service → App**

| Isian | Nilai |
|---|---|
| Source | GitHub, repo `toko-plastik`, branch `main` |
| Build Method | **Dockerfile** |
| Port | **3000** |

## 4. Environment variables

```
DATABASE_URL=postgresql://<user>:<password>@<host-internal>:5432/<db>?sslmode=disable
SESSION_SECRET=<hasil generate 32 byte hex>
SESSION_COOKIE_NAME=toko_plastik_session
NODE_ENV=production
APP_BASE_URL=https://tokoplastikdeni.gampangin.biz.id
NEXT_PUBLIC_APP_NAME=Toko Plastik & Bahan Kue
```

Generate secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Catatan:

- `DATABASE_URL` memakai **host internal** EasyPanel, bukan alamat publik.
  `sslmode=disable` aman karena lalu lintasnya tidak keluar dari jaringan project.
- `SESSION_SECRET` diperiksa saat request pertama, bukan saat build — jadi
  Docker build tetap jalan tanpa env, tapi aplikasi menolak start kalau
  secretnya kurang dari 32 karakter di produksi.

## 5. Deploy, lalu migrasi & seed

Setelah deploy pertama berhasil, buka **Terminal** pada service App:

```bash
npx prisma migrate deploy
npm run db:seed
```

`migrate deploy`, bukan `db push`. File migrasi ikut di-commit di
`prisma/migrations/`, jadi struktur produksi selalu bisa ditelusuri.

Seed idempoten — aman diulang. Isinya hanya user `owner`, user `kasir`, dan
record customer `UMUM`. **Tidak ada stok contoh**: stok awal dimasukkan lewat
menu Stok > Stok awal berdasarkan opname fisik hari go-live (PRD pasal 12).

## 6. Domain

**Domains → Add** → `tokoplastikdeni.gampangin.biz.id` → port `3000` → aktifkan HTTPS.

## 7. Setelah live

1. Login `owner` / `admin123`, **ganti password**.
2. Login `kasir` / `kasir123`, **ganti password**.
3. Ikuti urutan go-live di [README.md](README.md#go-live-prd-pasal-12).
4. Cek `https://tokoplastikdeni.gampangin.biz.id/api/health` mengembalikan `{"ok":true}`.

---

## Update berikutnya

```bash
git push          # EasyPanel rebuild otomatis
```

Kalau ada perubahan schema, jalankan lagi di terminal container:

```bash
npx prisma migrate deploy
```

## Kalau bermasalah

| Gejala | Penyebab yang paling sering |
|---|---|
| App restart terus | `SESSION_SECRET` kosong atau kurang dari 32 karakter |
| `DATABASE_URL harus berupa koneksi PostgreSQL` | env belum diisi, atau salah ketik skema URL-nya |
| Halaman login jalan tapi semua data kosong | `migrate deploy` dan `db:seed` belum dijalankan |
| Login berhasil lalu balik ke `/login` | Cookie `secure` butuh HTTPS — pastikan domain sudah pakai TLS |
| Build gagal di `prisma generate` | Dockerfile sudah menyiapkan `DATABASE_URL` palsu untuk build; jangan dihapus |
