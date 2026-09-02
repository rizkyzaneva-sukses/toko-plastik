-- Invarian PRD yang ditegakkan oleh database, bukan hanya oleh kode.
--
-- Pasal 4.3: "Stok tidak boleh minus."
-- Pasal 11 A6: "sisa hutang nota turun, tidak minus."
--
-- Alasan constraint ini ada: bug yang ditemukan saat debug — dua pelunasan
-- yang tersimpan bersamaan sama-sama membaca sisa hutang lama, lalu
-- masing-masing menguranginya, sehingga sisaHutang menjadi -200.000.
-- Locknya sudah diperbaiki di src/lib/pembayaran.ts; constraint ini adalah
-- lapis kedua supaya kesalahan sejenis tidak pernah bisa tersimpan diam-diam.

ALTER TABLE "purchases"
  ADD CONSTRAINT "purchases_sisa_hutang_tidak_minus" CHECK ("sisaHutang" >= 0),
  ADD CONSTRAINT "purchases_sisa_hutang_tidak_lebih_dari_total" CHECK ("sisaHutang" <= "total");

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_sisa_piutang_tidak_minus" CHECK ("sisaPiutang" >= 0),
  ADD CONSTRAINT "sales_sisa_piutang_tidak_lebih_dari_total" CHECK ("sisaPiutang" <= "total");

ALTER TABLE "stock_lots"
  ADD CONSTRAINT "stock_lots_qty_sisa_tidak_minus" CHECK ("qtySisa" >= 0),
  ADD CONSTRAINT "stock_lots_hpp_sisa_tidak_minus" CHECK ("hppSisa" >= 0),
  ADD CONSTRAINT "stock_lots_qty_sisa_tidak_lebih_dari_awal" CHECK ("qtySisa" <= "qtyAwal"),
  ADD CONSTRAINT "stock_lots_hpp_sisa_tidak_lebih_dari_awal" CHECK ("hppSisa" <= "hppTotalAwal");

-- Uang selalu positif; arah yang menentukan tanda (src/lib/kas.ts).
ALTER TABLE "cash_entries"
  ADD CONSTRAINT "cash_entries_nominal_positif" CHECK ("nominal" > 0);

ALTER TABLE "owner_loans"
  ADD CONSTRAINT "owner_loans_nominal_positif" CHECK ("nominal" > 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_total_positif" CHECK ("total" > 0);

ALTER TABLE "payment_allocations"
  ADD CONSTRAINT "payment_allocations_nominal_positif" CHECK ("nominal" > 0);
