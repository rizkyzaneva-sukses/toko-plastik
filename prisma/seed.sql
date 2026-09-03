-- Seed idempoten — aman dijalankan berkali-kali.
-- Dijalankan oleh docker-entrypoint.sh via psql setelah migrate deploy.
-- Password di-hash dengan bcrypt (cost 10). Ganti setelah login pertama.

-- Owner: owner / admin123
INSERT INTO users (id, nama, username, "passwordHash", role, "createdAt", "updatedAt")
VALUES (
  'seed-owner-001',
  'Owner Toko',
  'owner',
  '$2b$10$uR0NySj97XvEVvaskbjvRep/Ohk2Z0m1CjFjI0CgeCSk9EDJzDbge',
  'OWNER',
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- Kasir: kasir / kasir123
INSERT INTO users (id, nama, username, "passwordHash", role, "createdAt", "updatedAt")
VALUES (
  'seed-kasir-001',
  'Kasir',
  'kasir',
  '$2b$10$3daoDb2jY7kGACh/Os5yN.8MJd4EC0kJC2CCQr.vxFqb/JHzCSHj',
  'KASIR',
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- Party UMUM untuk penjualan retail cash tanpa nama (PRD pasal 7)
INSERT INTO parties (id, tipe, nama, "isSystem", aktif, catatan, "createdAt", "updatedAt")
VALUES (
  'seed-umum-001',
  'CUSTOMER',
  'UMUM',
  true,
  true,
  'Customer retail cash tanpa nama. Tidak boleh dipakai untuk penjualan kredit.',
  NOW(),
  NOW()
) ON CONFLICT (tipe, nama) DO UPDATE SET "isSystem" = true, aktif = true;
