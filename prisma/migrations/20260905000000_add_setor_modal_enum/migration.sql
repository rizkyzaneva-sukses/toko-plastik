-- Menambah nilai enum SETOR_MODAL yang dipakai fitur setoran modal owner
-- (src/lib/pinjaman.ts, src/app/api/kas/modal/route.ts). Tanpa ini schema.prisma
-- dan database drift: build sukses tapi insert CashEntry gagal saat runtime.
--
-- ALTER TYPE ... ADD VALUE boleh berada di dalam transaksi sejak PostgreSQL 12
-- selama nilai barunya tidak ikut dipakai pada migrasi yang sama.
ALTER TYPE "SumberLot" ADD VALUE IF NOT EXISTS 'SETOR_MODAL';
ALTER TYPE "JenisKas" ADD VALUE IF NOT EXISTS 'SETOR_MODAL';
