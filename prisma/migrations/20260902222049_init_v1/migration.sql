-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'KASIR');

-- CreateEnum
CREATE TYPE "SatuanDasar" AS ENUM ('GRAM', 'IKET', 'PCS');

-- CreateEnum
CREATE TYPE "PartyTipe" AS ENUM ('VENDOR', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "CaraBayar" AS ENUM ('CASH', 'CREDIT');

-- CreateEnum
CREATE TYPE "StatusNota" AS ENUM ('AKTIF', 'VOID');

-- CreateEnum
CREATE TYPE "SumberLot" AS ENUM ('PURCHASE', 'OPENING');

-- CreateEnum
CREATE TYPE "ArahPembayaran" AS ENUM ('VENDOR', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "ArahKas" AS ENUM ('MASUK', 'KELUAR');

-- CreateEnum
CREATE TYPE "JenisKas" AS ENUM ('SALE', 'PURCHASE', 'PAYMENT', 'OPEX', 'OWNER_LOAN', 'OWNER_REPAY', 'VOID', 'ADJUST', 'OPENING');

-- CreateEnum
CREATE TYPE "AlasanAdjust" AS ENUM ('SUSUT', 'RUSAK', 'OPNAME');

-- CreateEnum
CREATE TYPE "ArahAdjust" AS ENUM ('KURANG', 'TAMBAH');

-- CreateEnum
CREATE TYPE "ArahPinjaman" AS ENUM ('AMBIL', 'KEMBALI');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'KASIR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nota_counters" (
    "key" TEXT NOT NULL,
    "terakhir" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nota_counters_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "merek" TEXT NOT NULL,
    "kategori" TEXT,
    "satuanDasar" "SatuanDasar" NOT NULL,
    "namaSatuanBeli" TEXT NOT NULL,
    "konversiBeli" INTEGER NOT NULL,
    "hargaJualDefault" INTEGER NOT NULL,
    "hargaJualPerQty" INTEGER NOT NULL DEFAULT 1,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parties" (
    "id" TEXT NOT NULL,
    "tipe" "PartyTipe" NOT NULL,
    "nama" TEXT NOT NULL,
    "telepon" TEXT,
    "alamat" TEXT,
    "catatan" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cara" "CaraBayar" NOT NULL,
    "tempoHari" INTEGER NOT NULL DEFAULT 0,
    "jatuhTempo" TIMESTAMP(3),
    "total" BIGINT NOT NULL,
    "sisaHutang" BIGINT NOT NULL DEFAULT 0,
    "status" "StatusNota" NOT NULL DEFAULT 'AKTIF',
    "catatan" TEXT,
    "voidAt" TIMESTAMP(3),
    "voidAlasan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_items" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qtyBeli" INTEGER NOT NULL,
    "konversiSaat" INTEGER NOT NULL,
    "qtyDasar" INTEGER NOT NULL,
    "hppTotal" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_lots" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "purchaseItemId" TEXT,
    "sumber" "SumberLot" NOT NULL DEFAULT 'PURCHASE',
    "qtyAwal" INTEGER NOT NULL,
    "qtySisa" INTEGER NOT NULL,
    "hppTotalAwal" BIGINT NOT NULL,
    "hppSisa" BIGINT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "ref" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kasirId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cara" "CaraBayar" NOT NULL DEFAULT 'CASH',
    "tempoHari" INTEGER NOT NULL DEFAULT 0,
    "jatuhTempo" TIMESTAMP(3),
    "total" BIGINT NOT NULL,
    "hppTotal" BIGINT NOT NULL,
    "sisaPiutang" BIGINT NOT NULL DEFAULT 0,
    "status" "StatusNota" NOT NULL DEFAULT 'AKTIF',
    "catatan" TEXT,
    "voidAt" TIMESTAMP(3),
    "voidAlasan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "hargaRef" INTEGER NOT NULL,
    "qtyRef" INTEGER NOT NULL,
    "subtotal" BIGINT NOT NULL,
    "hpp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_lot_consumptions" (
    "id" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "hpp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_lot_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "arah" "ArahPembayaran" NOT NULL,
    "partyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" BIGINT NOT NULL,
    "catatan" TEXT,
    "status" "StatusNota" NOT NULL DEFAULT 'AKTIF',
    "voidAt" TIMESTAMP(3),
    "voidAlasan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "saleId" TEXT,
    "nominal" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_entries" (
    "id" TEXT NOT NULL,
    "jenis" "JenisKas" NOT NULL,
    "arah" "ArahKas" NOT NULL,
    "nominal" BIGINT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keterangan" TEXT NOT NULL,
    "kategori" TEXT,
    "refTipe" TEXT,
    "refId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_loans" (
    "id" TEXT NOT NULL,
    "arah" "ArahPinjaman" NOT NULL,
    "nominal" BIGINT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catatan" TEXT,
    "status" "StatusNota" NOT NULL DEFAULT 'AKTIF',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "alasan" "AlasanAdjust" NOT NULL,
    "arah" "ArahAdjust" NOT NULL,
    "qty" INTEGER NOT NULL,
    "catatan" TEXT NOT NULL,
    "nilaiHpp" BIGINT NOT NULL,
    "qtySistem" INTEGER,
    "qtyFisik" INTEGER,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjustment_lot_consumptions" (
    "id" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "hpp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjustment_lot_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "audit_logs_entitas_entitasId_idx" ON "audit_logs"("entitas", "entitasId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "products_aktif_idx" ON "products"("aktif");

-- CreateIndex
CREATE UNIQUE INDEX "products_nama_merek_key" ON "products"("nama", "merek");

-- CreateIndex
CREATE INDEX "parties_tipe_aktif_idx" ON "parties"("tipe", "aktif");

-- CreateIndex
CREATE UNIQUE INDEX "parties_tipe_nama_key" ON "parties"("tipe", "nama");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_nomor_key" ON "purchases"("nomor");

-- CreateIndex
CREATE INDEX "purchases_vendorId_status_idx" ON "purchases"("vendorId", "status");

-- CreateIndex
CREATE INDEX "purchases_tanggal_idx" ON "purchases"("tanggal");

-- CreateIndex
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_lots_purchaseItemId_key" ON "stock_lots"("purchaseItemId");

-- CreateIndex
CREATE INDEX "stock_lots_productId_aktif_purchasedAt_id_idx" ON "stock_lots"("productId", "aktif", "purchasedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_nomor_key" ON "sales"("nomor");

-- CreateIndex
CREATE INDEX "sales_customerId_status_idx" ON "sales"("customerId", "status");

-- CreateIndex
CREATE INDEX "sales_tanggal_idx" ON "sales"("tanggal");

-- CreateIndex
CREATE INDEX "sales_status_cara_idx" ON "sales"("status", "cara");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "sale_items_productId_idx" ON "sale_items"("productId");

-- CreateIndex
CREATE INDEX "sale_lot_consumptions_saleItemId_idx" ON "sale_lot_consumptions"("saleItemId");

-- CreateIndex
CREATE INDEX "sale_lot_consumptions_lotId_idx" ON "sale_lot_consumptions"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_nomor_key" ON "payments"("nomor");

-- CreateIndex
CREATE INDEX "payments_partyId_arah_status_idx" ON "payments"("partyId", "arah", "status");

-- CreateIndex
CREATE INDEX "payments_tanggal_idx" ON "payments"("tanggal");

-- CreateIndex
CREATE INDEX "payment_allocations_paymentId_idx" ON "payment_allocations"("paymentId");

-- CreateIndex
CREATE INDEX "payment_allocations_purchaseId_idx" ON "payment_allocations"("purchaseId");

-- CreateIndex
CREATE INDEX "payment_allocations_saleId_idx" ON "payment_allocations"("saleId");

-- CreateIndex
CREATE INDEX "cash_entries_tanggal_idx" ON "cash_entries"("tanggal");

-- CreateIndex
CREATE INDEX "cash_entries_jenis_idx" ON "cash_entries"("jenis");

-- CreateIndex
CREATE INDEX "cash_entries_refTipe_refId_idx" ON "cash_entries"("refTipe", "refId");

-- CreateIndex
CREATE INDEX "owner_loans_tanggal_idx" ON "owner_loans"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_nomor_key" ON "stock_adjustments"("nomor");

-- CreateIndex
CREATE INDEX "stock_adjustments_productId_idx" ON "stock_adjustments"("productId");

-- CreateIndex
CREATE INDEX "stock_adjustments_tanggal_idx" ON "stock_adjustments"("tanggal");

-- CreateIndex
CREATE INDEX "adjustment_lot_consumptions_adjustmentId_idx" ON "adjustment_lot_consumptions"("adjustmentId");

-- CreateIndex
CREATE INDEX "adjustment_lot_consumptions_lotId_idx" ON "adjustment_lot_consumptions"("lotId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_kasirId_fkey" FOREIGN KEY ("kasirId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lot_consumptions" ADD CONSTRAINT "sale_lot_consumptions_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_lot_consumptions" ADD CONSTRAINT "sale_lot_consumptions_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "stock_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_entries" ADD CONSTRAINT "cash_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_loans" ADD CONSTRAINT "owner_loans_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_lot_consumptions" ADD CONSTRAINT "adjustment_lot_consumptions_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "stock_adjustments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_lot_consumptions" ADD CONSTRAINT "adjustment_lot_consumptions_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "stock_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
