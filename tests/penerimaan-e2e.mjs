/**
 * Uji penerimaan V1 — PRD pasal 11, dijalankan terhadap server + database nyata.
 *
 * Yang diuji di sini adalah A1 sampai A14 yang tidak bisa diuji tanpa database:
 * lot FIFO tersimpan, kas benar-benar bergerak (atau tidak), hutang/piutang,
 * void, hak akses kasir, dan audit log.
 *
 * Cara pakai:
 *   1. Siapkan database KOSONG khusus uji, lalu:  npx prisma migrate deploy && npx prisma db seed
 *   2. Jalankan server:                            npm run dev
 *   3. Jalankan uji:                               node tests/penerimaan-e2e.mjs [http://127.0.0.1:3000]
 *
 * Skrip ini MENULIS data. Jangan pernah diarahkan ke database produksi.
 */

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";

let lulus = 0;
let gagal = 0;
const kegagalan = [];

function cek(id, keterangan, kondisi, detail = "") {
  if (kondisi) {
    lulus++;
    console.log(`  PASS  ${id}  ${keterangan}`);
  } else {
    gagal++;
    kegagalan.push(`${id} — ${keterangan}${detail ? `\n        ${detail}` : ""}`);
    console.log(`  FAIL  ${id}  ${keterangan}${detail ? `\n        ${detail}` : ""}`);
  }
}

function judul(teks) {
  console.log(`\n${teks}`);
}

// --------------------------------------------------------------------------
// Klien HTTP sederhana dengan cookie per user
// --------------------------------------------------------------------------

function buatKlien() {
  let cookie = "";
  return {
    async req(metode, path, body) {
      const res = await fetch(BASE + path, {
        method: metode,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "manual",
      });

      const setCookie = res.headers.getSetCookie?.() ?? [];
      for (const c of setCookie) {
        const potong = c.split(";")[0];
        if (potong.split("=")[1]) cookie = potong;
      }

      const teks = await res.text();
      let data = null;
      try {
        data = teks ? JSON.parse(teks) : null;
      } catch {
        data = { _mentah: teks.slice(0, 200) };
      }
      return { status: res.status, data };
    },
    get(p) {
      return this.req("GET", p);
    },
    post(p, b) {
      return this.req("POST", p, b);
    },
    put(p, b) {
      return this.req("PUT", p, b);
    },
    del(p) {
      return this.req("DELETE", p);
    },
  };
}

const owner = buatKlien();
const kasir = buatKlien();

const stempel = Date.now().toString().slice(-6);
const nama = (n) => `${n} UJI${stempel}`;

async function saldoKas() {
  const { data } = await owner.get("/api/kas");
  return data.saldoSekarang;
}

async function stokProduk(productId) {
  const { data } = await owner.get("/api/laporan/stok");
  return data.stok.find((s) => s.productId === productId);
}

// --------------------------------------------------------------------------

async function main() {
  console.log(`Uji penerimaan V1 terhadap ${BASE}\n`);

  // ---- Login -------------------------------------------------------------
  judul("Login");
  const loginOwner = await owner.post("/api/auth/login", {
    username: "owner",
    password: process.env.SEED_OWNER_PASSWORD || "admin123",
  });
  cek("L1", "owner bisa login", loginOwner.status === 200, JSON.stringify(loginOwner.data));
  if (loginOwner.status !== 200) {
    console.log("\nTidak bisa lanjut tanpa login owner. Pastikan seed sudah dijalankan.");
    process.exit(1);
  }

  const loginKasir = await kasir.post("/api/auth/login", {
    username: "kasir",
    password: process.env.SEED_KASIR_PASSWORD || "kasir123",
  });
  cek("L2", "kasir bisa login", loginKasir.status === 200);

  const loginSalah = await buatKlien().post("/api/auth/login", {
    username: "owner",
    password: "salah-sekali",
  });
  cek("L3", "password salah ditolak 401", loginSalah.status === 401);
  cek(
    "L4",
    "pesan gagal login generik (tidak membocorkan username benar/salah)",
    loginSalah.data?.error === "Username atau password salah",
    loginSalah.data?.error
  );

  // ---- Master ------------------------------------------------------------
  judul("Master barang & pihak");

  const gulaRes = await owner.post("/api/produk", {
    nama: nama("Gula Pasir"),
    merek: "Merek A",
    kategori: "Bahan Kue",
    satuanDasar: "GRAM",
    namaSatuanBeli: "karung",
    konversiBeli: 50000,
    hargaJualDefault: 13500,
    hargaJualPerQty: 1000,
  });
  cek("M1", "owner bisa membuat barang gram", gulaRes.status === 201, JSON.stringify(gulaRes.data));
  const gula = gulaRes.data?.produk;

  const gulaBRes = await owner.post("/api/produk", {
    nama: nama("Gula Pasir"),
    merek: "Merek B",
    satuanDasar: "GRAM",
    namaSatuanBeli: "karung",
    konversiBeli: 50000,
    hargaJualDefault: 14000,
    hargaJualPerQty: 1000,
  });
  const gulaB = gulaBRes.data?.produk;

  const plastikRes = await owner.post("/api/produk", {
    nama: nama("Plastik PE"),
    merek: "Bening 15",
    satuanDasar: "IKET",
    namaSatuanBeli: "iket",
    konversiBeli: 1,
    hargaJualDefault: 25000,
    hargaJualPerQty: 1,
  });
  cek("M2", "barang iket dibuat dengan konversi 1", plastikRes.status === 201);
  const plastik = plastikRes.data?.produk;

  const plastikSalah = await owner.post("/api/produk", {
    nama: nama("Plastik Salah"),
    merek: "X",
    satuanDasar: "IKET",
    namaSatuanBeli: "iket",
    konversiBeli: 10000,
    hargaJualDefault: 25000,
    hargaJualPerQty: 1,
  });
  cek(
    "A13a",
    "barang IKET dengan konversi gram ditolak",
    plastikSalah.status === 400,
    plastikSalah.data?.error
  );

  const tanpaMerek = await owner.post("/api/produk", {
    nama: nama("Tanpa Merek"),
    merek: "",
    satuanDasar: "GRAM",
    namaSatuanBeli: "karung",
    konversiBeli: 1000,
    hargaJualDefault: 1000,
    hargaJualPerQty: 1000,
  });
  cek("A14a", "merek kosong ditolak (merek beda = SKU beda)", tanpaMerek.status === 400);

  const vendorRes = await owner.post("/api/pihak", { tipe: "VENDOR", nama: nama("Vendor") });
  const vendor = vendorRes.data?.pihak;
  cek("M3", "vendor dibuat", vendorRes.status === 201);

  const custRes = await owner.post("/api/pihak", { tipe: "CUSTOMER", nama: nama("Toko Kue") });
  const customer = custRes.data?.pihak;

  const { data: pihakData } = await owner.get("/api/pihak?tipe=CUSTOMER");
  const umum = pihakData.pihak.find((p) => p.isSystem);
  cek("M4", "record UMUM tersedia dari seed", Boolean(umum));

  // ---- A5: beli kredit ---------------------------------------------------
  judul("A5 — beli kredit, belum bayar");
  const kasSebelumBeliKredit = await saldoKas();

  const beliKredit = await owner.post("/api/pembelian", {
    vendorId: vendor.id,
    cara: "CREDIT",
    tempoHari: 14,
    items: [{ productId: gula.id, qtyBeli: 1, hppTotal: 600000 }],
  });
  cek("A5a", "nota beli kredit tersimpan", beliKredit.status === 201, JSON.stringify(beliKredit.data));
  const notaKredit = beliKredit.data?.nota;

  const kasSesudahBeliKredit = await saldoKas();
  cek(
    "A5b",
    "kas TIDAK berkurang saat beli kredit",
    kasSesudahBeliKredit === kasSebelumBeliKredit,
    `kas ${kasSebelumBeliKredit} -> ${kasSesudahBeliKredit}`
  );
  cek("A5c", "sisa hutang = total nota", notaKredit?.sisaHutang === 600000, `sisa ${notaKredit?.sisaHutang}`);

  let stok = await stokProduk(gula.id);
  cek("A5d", "lot tetap terbentuk walau belum dibayar", stok.qty === 50000, `qty ${stok?.qty}`);
  cek("A5e", "nilai lot = harga beli", stok.nilai === 600000, `nilai ${stok?.nilai}`);

  // ---- Beli cash ---------------------------------------------------------
  judul("Beli cash — kas keluar");
  const kasSebelumBeliCash = await saldoKas();
  const beliCash = await owner.post("/api/pembelian", {
    vendorId: vendor.id,
    cara: "CASH",
    items: [{ productId: gula.id, qtyBeli: 1, hppTotal: 700000 }],
  });
  cek("B1", "nota beli cash tersimpan", beliCash.status === 201);
  const kasSesudahBeliCash = await saldoKas();
  cek(
    "B2",
    "kas berkurang persis sebesar nota",
    kasSesudahBeliCash === kasSebelumBeliCash - 700000,
    `kas ${kasSebelumBeliCash} -> ${kasSesudahBeliCash}`
  );

  // ---- A1: qty desimal ---------------------------------------------------
  judul("A1 — input jual 0,25 kg");
  const jualDesimal = await kasir.post("/api/penjualan", {
    customerId: umum.id,
    cara: "CASH",
    items: [{ productId: gula.id, qty: "0,25" }],
  });
  cek("A1a", "0,25 ditolak dengan 400", jualDesimal.status === 400, JSON.stringify(jualDesimal.data));
  cek(
    "A1b",
    "pesan errornya mengajari kasir menulis gram",
    /250/.test(jualDesimal.data?.error ?? ""),
    jualDesimal.data?.error
  );

  const jualTitik = await kasir.post("/api/penjualan", {
    customerId: umum.id,
    cara: "CASH",
    items: [{ productId: gula.id, qty: "0.5" }],
  });
  cek("A1c", "0.5 juga ditolak", jualTitik.status === 400);

  // ---- A2: jual 250 g ----------------------------------------------------
  judul("A2 — beli 1 karung 50 kg, jual 250 g");
  const jual250 = await kasir.post("/api/penjualan", {
    customerId: umum.id,
    cara: "CASH",
    items: [{ productId: gula.id, qty: "250" }],
  });
  cek("A2a", "nota jual 250 g tersimpan", jual250.status === 201, JSON.stringify(jual250.data));
  cek(
    "A2b",
    "subtotal Rp 13.500/kg untuk 250 g = Rp 3.375",
    jual250.data?.nota?.total === 3375,
    `total ${jual250.data?.nota?.total}`
  );

  stok = await stokProduk(gula.id);
  cek(
    "A2c",
    "sisa stok 99.750 g (2 karung − 250 g), SKU tetap satu",
    stok.qty === 99750,
    `qty ${stok?.qty}`
  );

  // ---- A3: FIFO menembus lot --------------------------------------------
  judul("A3 — dua lot harga beda, jual menembus lot pertama");
  // Lot 1 sisa 49.750 g dari 600.000 (HPP sisa 597.000), lot 2 50.000 g @ 700.000.
  // Jual 60.000 g -> habiskan lot 1 (597.000) + 10.250 g dari lot 2.
  const jualTembus = await kasir.post("/api/penjualan", {
    customerId: umum.id,
    cara: "CASH",
    items: [{ productId: gula.id, qty: "60000" }],
  });
  cek("A3a", "nota tersimpan", jualTembus.status === 201, JSON.stringify(jualTembus.data));

  const notaTembus = await owner.get(`/api/penjualan/${jualTembus.data?.nota?.id}`);
  const konsumsi = notaTembus.data?.nota?.items?.[0]?.consumptions ?? [];
  cek("A3b", "konsumsi lot tersimpan untuk DUA lot", konsumsi.length === 2, `${konsumsi.length} lot`);

  const hppTotal = konsumsi.reduce((a, c) => a + c.hpp, 0);
  // lot1 = 597.000 ; lot2 = 700.000 * 10.250 / 50.000 = 143.500
  cek(
    "A3c",
    "HPP pecah sesuai FIFO: 597.000 + 143.500 = 740.500",
    hppTotal === 740500,
    `hpp ${hppTotal}`
  );
  cek(
    "A3d",
    "lot tertua dipakai lebih dulu dan habis",
    konsumsi[0]?.qty === 49750,
    `lot pertama qty ${konsumsi[0]?.qty}`
  );

  stok = await stokProduk(gula.id);
  cek("A3e", "sisa 39.750 g", stok.qty === 39750, `qty ${stok?.qty}`);
  cek(
    "A3f",
    "sisa nilai lot kedua = 700.000 − 143.500 = 556.500",
    stok.nilai === 556500,
    `nilai ${stok?.nilai}`
  );

  // ---- A4: jual melebihi stok -------------------------------------------
  judul("A4 — jual melebihi stok");
  const stokSebelum = await stokProduk(gula.id);
  const jualKebanyakan = await kasir.post("/api/penjualan", {
    customerId: umum.id,
    cara: "CASH",
    items: [
      { productId: gula.id, qty: "1000" }, // baris ini sendiri valid
      { productId: gula.id, qty: "999999" }, // baris ini yang gagal
    ],
  });
  cek("A4a", "nota ditolak 400", jualKebanyakan.status === 400, JSON.stringify(jualKebanyakan.data));

  const stokSesudah = await stokProduk(gula.id);
  cek(
    "A4b",
    "SELURUH nota batal — baris pertama tidak ikut terpotong",
    stokSesudah.qty === stokSebelum.qty,
    `qty ${stokSebelum.qty} -> ${stokSesudah.qty}`
  );

  // ---- A13: plastik per iket --------------------------------------------
  judul("A13 — plastik beli/jual iket");
  await owner.post("/api/pembelian", {
    vendorId: vendor.id,
    cara: "CASH",
    items: [{ productId: plastik.id, qtyBeli: 20, hppTotal: 400000 }],
  });
  let stokPlastik = await stokProduk(plastik.id);
  cek("A13b", "beli 20 iket menjadi stok 20 iket", stokPlastik.qty === 20, `qty ${stokPlastik?.qty}`);

  const jualPlastik = await kasir.post("/api/penjualan", {
    customerId: umum.id,
    cara: "CASH",
    items: [{ productId: plastik.id, qty: "3" }],
  });
  cek("A13c", "jual 3 iket berhasil", jualPlastik.status === 201);
  cek(
    "A13d",
    "harga per iket dipakai apa adanya: 3 x 25.000",
    jualPlastik.data?.nota?.total === 75000,
    `total ${jualPlastik.data?.nota?.total}`
  );
  stokPlastik = await stokProduk(plastik.id);
  cek("A13e", "sisa 17 iket", stokPlastik.qty === 17);

  // ---- A14: dua merek ----------------------------------------------------
  judul("A14 — merek A vs B, ukuran sama");
  await owner.post("/api/pembelian", {
    vendorId: vendor.id,
    cara: "CASH",
    items: [{ productId: gulaB.id, qtyBeli: 1, hppTotal: 800000 }],
  });
  const stokA = await stokProduk(gula.id);
  const stokB = await stokProduk(gulaB.id);
  cek("A14b", "dua SKU terpisah", stokA.productId !== stokB.productId);
  cek("A14c", "antrian lot merek B berdiri sendiri", stokB.qty === 50000 && stokB.nilai === 800000);
  cek("A14d", "stok merek A tidak berubah karena pembelian merek B", stokA.qty === 39750);

  // ---- A7: jual kredit lalu lunas ---------------------------------------
  judul("A7 — jual kredit lalu lunas");
  const kasSebelumJualKredit = await saldoKas();
  const jualKredit = await kasir.post("/api/penjualan", {
    customerId: customer.id,
    cara: "CREDIT",
    tempoHari: 7,
    items: [{ productId: gula.id, qty: "1000" }],
  });
  cek("A7a", "nota jual kredit tersimpan", jualKredit.status === 201, JSON.stringify(jualKredit.data));
  const totalKredit = jualKredit.data?.nota?.total;

  const kasSesudahJualKredit = await saldoKas();
  cek(
    "A7b",
    "kas TIDAK naik saat nota kredit dibuat",
    kasSesudahJualKredit === kasSebelumJualKredit,
    `kas ${kasSebelumJualKredit} -> ${kasSesudahJualKredit}`
  );

  const kreditKeUmum = await kasir.post("/api/penjualan", {
    customerId: umum.id,
    cara: "CREDIT",
    tempoHari: 7,
    items: [{ productId: gula.id, qty: "100" }],
  });
  cek(
    "A7c",
    "jual kredit ke UMUM ditolak (kredit wajib nama)",
    kreditKeUmum.status === 400,
    kreditKeUmum.data?.error
  );

  const lunas = await kasir.post("/api/pembayaran", {
    arah: "CUSTOMER",
    partyId: customer.id,
    nominal: totalKredit,
  });
  cek("A7d", "pelunasan piutang tersimpan", lunas.status === 201, JSON.stringify(lunas.data));

  const kasSesudahLunas = await saldoKas();
  cek(
    "A7e",
    "kas baru naik saat pelunasan diterima",
    kasSesudahLunas === kasSesudahJualKredit + totalKredit,
    `kas ${kasSesudahJualKredit} -> ${kasSesudahLunas}, nota ${totalKredit}`
  );

  const bayarLagi = await kasir.post("/api/pembayaran", {
    arah: "CUSTOMER",
    partyId: customer.id,
    nominal: 1000,
  });
  cek(
    "A7f",
    "bayar lagi setelah lunas ditolak (tidak ada uang hantu)",
    bayarLagi.status === 400,
    bayarLagi.data?.error
  );

  // ---- A6: cicil hutang --------------------------------------------------
  judul("A6 — cicil hutang vendor sebagian");
  const kasSebelumCicil = await saldoKas();
  const cicil = await owner.post("/api/pembayaran", {
    arah: "VENDOR",
    partyId: vendor.id,
    nominal: 200000,
  });
  cek("A6a", "cicilan tersimpan", cicil.status === 201, JSON.stringify(cicil.data));
  cek(
    "A6b",
    "alokasi masuk ke nota kredit tertua",
    cicil.data?.rincian?.[0]?.nomor === notaKredit?.nomor,
    JSON.stringify(cicil.data?.rincian)
  );

  const kasSesudahCicil = await saldoKas();
  cek(
    "A6c",
    "kas turun sebesar cicilan",
    kasSesudahCicil === kasSebelumCicil - 200000,
    `kas ${kasSebelumCicil} -> ${kasSesudahCicil}`
  );

  const { data: hutangData } = await owner.get("/api/laporan/hutang");
  const notaSisa = hutangData.hutang.find((h) => h.nomor === notaKredit?.nomor);
  cek(
    "A6d",
    "sisa hutang nota turun jadi 400.000, tidak minus",
    notaSisa?.sisaHutang === 400000,
    `sisa ${notaSisa?.sisaHutang}`
  );

  const cicilKebanyakan = await owner.post("/api/pembayaran", {
    arah: "VENDOR",
    partyId: vendor.id,
    nominal: 999999999,
  });
  cek(
    "A6e",
    "bayar melebihi total tagihan ditolak",
    cicilKebanyakan.status === 400,
    cicilKebanyakan.data?.error
  );

  // ---- A8: pinjaman owner ------------------------------------------------
  judul("A8 — owner pinjam 1.000.000");
  const kasSebelumPinjam = await saldoKas();
  const { data: labaSebelum } = await owner.get("/api/laporan/laba");
  // Diukur sebagai SELISIH, bukan nilai absolut — supaya uji ini tetap benar
  // walau database sudah berisi data dari run sebelumnya.
  const { data: pinjamanSebelum } = await owner.get("/api/pinjaman");

  const pinjam = await owner.post("/api/pinjaman", { arah: "AMBIL", nominal: 1000000 });
  cek("A8a", "pinjaman tercatat", pinjam.status === 201, JSON.stringify(pinjam.data));

  const kasSesudahPinjam = await saldoKas();
  cek(
    "A8b",
    "kas berkurang 1.000.000",
    kasSesudahPinjam === kasSebelumPinjam - 1000000,
    `kas ${kasSebelumPinjam} -> ${kasSesudahPinjam}`
  );
  cek(
    "A8c",
    "saldo utang owner naik 1.000.000",
    pinjam.data?.saldo === pinjamanSebelum.saldo + 1000000,
    `saldo ${pinjamanSebelum.saldo} -> ${pinjam.data?.saldo}`
  );

  const { data: labaSesudah } = await owner.get("/api/laporan/laba");
  cek(
    "A8d",
    "laba kotor TIDAK berubah karena pinjaman",
    labaSesudah.laba.labaKotor === labaSebelum.laba.labaKotor,
    `laba ${labaSebelum.laba.labaKotor} -> ${labaSesudah.laba.labaKotor}`
  );
  cek(
    "A8e",
    "laporan laba selalu menyertakan peringatan kas",
    typeof labaSesudah.peringatan === "string" && labaSesudah.peringatan.length > 40
  );

  const kembalikanKebanyakan = await owner.post("/api/pinjaman", {
    arah: "KEMBALI",
    nominal: 5000000,
  });
  cek(
    "A8f",
    "mengembalikan lebih dari saldo pinjaman ditolak",
    kembalikanKebanyakan.status === 400,
    kembalikanKebanyakan.data?.error
  );

  // ---- A9: susut ---------------------------------------------------------
  judul("A9 — susut 500 g");
  const stokSebelumSusut = await stokProduk(gula.id);
  const { data: labaSebelumSusut } = await owner.get("/api/laporan/laba");

  const susut = await owner.post("/api/penyesuaian", {
    productId: gula.id,
    alasan: "SUSUT",
    qty: "500",
    catatan: "Tumpah saat menakar ulang",
  });
  cek("A9a", "penyesuaian tersimpan", susut.status === 201, JSON.stringify(susut.data));

  const stokSesudahSusut = await stokProduk(gula.id);
  cek(
    "A9b",
    "stok berkurang 500 g lewat lot FIFO",
    stokSesudahSusut.qty === stokSebelumSusut.qty - 500,
    `qty ${stokSebelumSusut.qty} -> ${stokSesudahSusut.qty}`
  );
  cek(
    "A9c",
    "nilai HPP ikut berkurang, bukan menggantung",
    stokSesudahSusut.nilai < stokSebelumSusut.nilai
  );

  const { data: labaSesudahSusut } = await owner.get("/api/laporan/laba");
  cek(
    "A9d",
    "susut TIDAK menambah omzet",
    labaSesudahSusut.laba.omzet === labaSebelumSusut.laba.omzet,
    `omzet ${labaSebelumSusut.laba.omzet} -> ${labaSesudahSusut.laba.omzet}`
  );
  cek(
    "A9e",
    "kerugian stok tercatat terpisah",
    labaSesudahSusut.laba.kerugianStok > labaSebelumSusut.laba.kerugianStok,
    `kerugian ${labaSebelumSusut.laba.kerugianStok} -> ${labaSesudahSusut.laba.kerugianStok}`
  );

  const susutTanpaAlasan = await owner.post("/api/penyesuaian", {
    productId: gula.id,
    alasan: "SUSUT",
    qty: "100",
    catatan: "",
  });
  cek("A12a", "penyesuaian tanpa alasan ditolak", susutTanpaAlasan.status === 400, susutTanpaAlasan.data?.error);

  const susutAlasanPendek = await owner.post("/api/penyesuaian", {
    productId: gula.id,
    alasan: "SUSUT",
    qty: "100",
    catatan: "ok",
  });
  cek("A12b", "alasan terlalu pendek ditolak", susutAlasanPendek.status === 400);

  // ---- A12: opname -------------------------------------------------------
  judul("A12 — opname selisih");
  const stokSebelumOpname = await stokProduk(gula.id);
  const opnameTanpaAlasan = await owner.post("/api/penyesuaian", {
    productId: gula.id,
    alasan: "OPNAME",
    qtyFisik: String(stokSebelumOpname.qty - 1000),
    catatan: "",
  });
  cek("A12c", "opname tanpa alasan ditolak", opnameTanpaAlasan.status === 400);

  const opname = await owner.post("/api/penyesuaian", {
    productId: gula.id,
    alasan: "OPNAME",
    qtyFisik: String(stokSebelumOpname.qty - 1000),
    catatan: "Hasil hitung fisik dua mingguan",
  });
  cek("A12d", "opname dengan alasan tersimpan", opname.status === 201, JSON.stringify(opname.data));
  cek(
    "A12e",
    "arah dan qty dihitung dari selisih fisik vs sistem",
    opname.data?.penyesuaian?.arah === "KURANG" && opname.data?.penyesuaian?.qty === 1000,
    JSON.stringify(opname.data?.penyesuaian)
  );

  const stokSesudahOpname = await stokProduk(gula.id);
  cek(
    "A12f",
    "stok sistem menyusul hasil fisik",
    stokSesudahOpname.qty === stokSebelumOpname.qty - 1000,
    `qty ${stokSebelumOpname.qty} -> ${stokSesudahOpname.qty}`
  );

  const opnameSama = await owner.post("/api/penyesuaian", {
    productId: gula.id,
    alasan: "OPNAME",
    qtyFisik: String(stokSesudahOpname.qty),
    catatan: "Cocok, tidak ada selisih",
  });
  cek("A12g", "opname tanpa selisih ditolak (tidak membuat entri kosong)", opnameSama.status === 400);

  // ---- A10: hak akses kasir ---------------------------------------------
  judul("A10 — kasir mencoba naik hak");
  const notaCashUntukVoid = await kasir.post("/api/penjualan", {
    customerId: umum.id,
    cara: "CASH",
    items: [{ productId: gula.id, qty: "1000" }],
  });
  const idUntukVoid = notaCashUntukVoid.data?.nota?.id;

  const kasirVoid = await kasir.post(`/api/penjualan/${idUntukVoid}/void`, { alasan: "iseng" });
  cek("A10a", "kasir void nota -> 403", kasirVoid.status === 403, JSON.stringify(kasirVoid.data));

  const kasirUbahProduk = await kasir.put(`/api/produk/${gula.id}`, {
    nama: gula.nama,
    merek: gula.merek,
    satuanDasar: "GRAM",
    namaSatuanBeli: "karung",
    konversiBeli: 1,
    hargaJualDefault: 1,
    hargaJualPerQty: 1000,
  });
  cek("A10b", "kasir ubah master/konversi -> 403", kasirUbahProduk.status === 403);

  const kasirAudit = await kasir.get("/api/audit");
  cek("A10c", "kasir buka audit log -> 403", kasirAudit.status === 403);

  const kasirBeli = await kasir.post("/api/pembelian", {
    vendorId: vendor.id,
    cara: "CASH",
    items: [{ productId: gula.id, qtyBeli: 1, hppTotal: 1 }],
  });
  cek("A10d", "kasir catat pembelian (menentukan HPP) -> 403", kasirBeli.status === 403);

  const kasirPinjaman = await kasir.post("/api/pinjaman", { arah: "AMBIL", nominal: 1000 });
  cek("A10e", "kasir ambil pinjaman owner -> 403", kasirPinjaman.status === 403);

  const kasirBayarVendor = await kasir.post("/api/pembayaran", {
    arah: "VENDOR",
    partyId: vendor.id,
    nominal: 1000,
  });
  cek("A10f", "kasir bayar hutang vendor -> ditolak", kasirBayarVendor.status === 400 || kasirBayarVendor.status === 403);

  const kasirOpname = await kasir.post("/api/penyesuaian", {
    productId: gula.id,
    alasan: "OPNAME",
    qtyFisik: "1",
    catatan: "coba-coba",
  });
  cek("A10g", "kasir opname tanpa owner -> 403", kasirOpname.status === 403);

  const kasirKas = await kasir.get("/api/kas");
  cek("A10h", "kasir buka mutasi kas -> 403", kasirKas.status === 403);

  const { data: stokKasir } = await kasir.get("/api/laporan/stok");
  const barisKasir = stokKasir.stok.find((s) => s.productId === gula.id);
  cek("A10i", "kasir tetap boleh lihat stok (pasal 3)", barisKasir?.qty > 0);
  cek("A10j", "tapi nilai HPP disembunyikan dari kasir", barisKasir?.nilai === null, `nilai ${barisKasir?.nilai}`);

  const tanpaLogin = await buatKlien().get("/api/laporan/stok");
  cek("A10k", "tanpa login -> 401", tanpaLogin.status === 401);

  // ---- A11: owner void jual cash ----------------------------------------
  judul("A11 — owner void jual cash");
  const stokSebelumVoid = await stokProduk(gula.id);
  const kasSebelumVoid = await saldoKas();
  const totalNotaVoid = notaCashUntukVoid.data?.nota?.total;

  const voidTanpaAlasan = await owner.post(`/api/penjualan/${idUntukVoid}/void`, { alasan: "" });
  cek("A11a", "void tanpa alasan ditolak", voidTanpaAlasan.status === 400);

  const voidOk = await owner.post(`/api/penjualan/${idUntukVoid}/void`, {
    alasan: "Salah input qty, barang dikembalikan ke rak",
  });
  cek("A11b", "owner bisa void", voidOk.status === 200, JSON.stringify(voidOk.data));
  cek("A11c", "status nota jadi VOID, bukan terhapus", voidOk.data?.nota?.status === "VOID");

  const stokSesudahVoid = await stokProduk(gula.id);
  cek(
    "A11d",
    "stok kembali ke lot semula",
    stokSesudahVoid.qty === stokSebelumVoid.qty + 1000,
    `qty ${stokSebelumVoid.qty} -> ${stokSesudahVoid.qty}`
  );
  cek(
    "A11e",
    "nilai HPP lot ikut kembali",
    stokSesudahVoid.nilai > stokSebelumVoid.nilai,
    `nilai ${stokSebelumVoid.nilai} -> ${stokSesudahVoid.nilai}`
  );

  const kasSesudahVoid = await saldoKas();
  cek(
    "A11f",
    "kas dibalik sebesar total nota",
    kasSesudahVoid === kasSebelumVoid - totalNotaVoid,
    `kas ${kasSebelumVoid} -> ${kasSesudahVoid}, nota ${totalNotaVoid}`
  );

  const voidDuaKali = await owner.post(`/api/penjualan/${idUntukVoid}/void`, { alasan: "sekali lagi" });
  cek("A11g", "void dua kali ditolak", voidDuaKali.status === 400);

  const { data: auditData } = await owner.get("/api/audit?entitas=Sale");
  const logVoid = auditData.log.find((l) => l.entitasId === idUntukVoid && l.aksi === "VOID");
  cek("A11h", "void tercatat di audit log dengan alasannya", Boolean(logVoid), JSON.stringify(logVoid?.keterangan));

  // ---- Void pembelian yang barangnya sudah laku -------------------------
  judul("Void pembelian yang stoknya sudah tersentuh");
  const voidBeliTerpakai = await owner.post(`/api/pembelian/${notaKredit?.id}/void`, {
    alasan: "Coba batalkan padahal sudah laku",
  });
  cek(
    "V1",
    "void pembelian yang sudah dibayar/terjual ditolak, bukan memalsukan HPP",
    voidBeliTerpakai.status === 400,
    voidBeliTerpakai.data?.error
  );

  // ---- Laporan -----------------------------------------------------------
  judul("Laporan pasal 10");
  const { data: laporanLaba } = await owner.get("/api/laporan/laba");
  const { data: laporanStokAkhir } = await owner.get("/api/laporan/stok");
  const { data: ringkasanData } = await owner.get("/api/laporan/ringkasan");

  cek("R1", "laba kotor = omzet − HPP", laporanLaba.laba.labaKotor === laporanLaba.laba.omzet - laporanLaba.laba.hpp);

  const nilaiStokLaporan = laporanStokAkhir.stok.reduce((a, s) => a + s.nilai, 0);
  cek(
    "R2",
    "nilai stok di ringkasan = jumlah nilai lot",
    ringkasanData.ringkasan.nilaiStok === nilaiStokLaporan,
    `${ringkasanData.ringkasan.nilaiStok} vs ${nilaiStokLaporan}`
  );

  const { data: pinjamanAkhir } = await owner.get("/api/pinjaman");
  cek(
    "R3",
    "saldo pinjaman owner di ringkasan sama dengan halaman pinjaman",
    ringkasanData.ringkasan.pinjamanOwner === pinjamanAkhir.saldo &&
      pinjamanAkhir.saldo >= 1000000,
    `ringkasan ${ringkasanData.ringkasan.pinjamanOwner} vs pinjaman ${pinjamanAkhir.saldo}`
  );

  const { data: ringkasanKasir } = await kasir.get("/api/laporan/ringkasan");
  cek(
    "R4",
    "kasir tidak melihat kas, hutang, piutang, pinjaman",
    ringkasanKasir.ringkasan.saldoKas === null &&
      ringkasanKasir.ringkasan.totalHutang === null &&
      ringkasanKasir.ringkasan.pinjamanOwner === null
  );

  // ---- Biaya operasional tidak mengubah HPP -----------------------------
  judul("Pasal 4.2 — ongkir tidak masuk HPP");
  const stokSebelumOngkir = await stokProduk(gula.id);
  const kasSebelumOngkir = await saldoKas();
  const ongkir = await owner.post("/api/kas/biaya", {
    nominal: 50000,
    kategori: "Ongkir",
    keterangan: "Kirim gula dari vendor",
  });
  cek("O1", "biaya operasional tersimpan", ongkir.status === 201);

  const stokSesudahOngkir = await stokProduk(gula.id);
  cek(
    "O2",
    "nilai stok TIDAK berubah karena ongkir",
    stokSesudahOngkir.nilai === stokSebelumOngkir.nilai,
    `${stokSebelumOngkir.nilai} -> ${stokSesudahOngkir.nilai}`
  );
  cek("O3", "kas berkurang sebesar ongkir", (await saldoKas()) === kasSebelumOngkir - 50000);

  // ---- Audit log ---------------------------------------------------------
  judul("Pasal 7 — audit log");
  const { data: auditSemua } = await owner.get("/api/audit?batas=500");
  const aksiAda = new Set(auditSemua.log.map((l) => l.aksi));
  for (const aksi of ["LOGIN", "CREATE", "VOID", "ADJUST", "OPNAME", "PAYMENT", "OWNER_LOAN", "OPEX"]) {
    cek(`AL-${aksi}`, `aksi ${aksi} tercatat di audit log`, aksiAda.has(aksi));
  }
  cek(
    "AL1",
    "setiap catatan menyebut siapa pelakunya",
    auditSemua.log.every((l) => l.user?.nama)
  );

  // ---- Regresi bug yang pernah ditemukan --------------------------------
  // Bagian ini bukan dari PRD. Isinya bug nyata yang pernah lolos ke dalam
  // kode dan ditemukan saat sesi debug. Jangan dihapus.
  judul("Regresi — bug yang pernah terjadi");

  // R-HPP: HPP sempat bocor ke kasir lewat API walau layarnya sudah menutupi.
  const notaHpp = await kasir.post("/api/penjualan", {
    customerId: umum.id,
    cara: "CASH",
    items: [{ productId: gula.id, qty: "100" }],
  });
  const idHpp = notaHpp.data?.nota?.id;

  const produkKasir = await kasir.get("/api/produk");
  cek(
    "RG1",
    "GET /api/produk tidak mengirim nilai HPP ke kasir",
    produkKasir.data?.produk?.every((p) => p.stokNilai === null),
    `contoh stokNilai: ${produkKasir.data?.produk?.[0]?.stokNilai}`
  );

  const listKasir = await kasir.get("/api/penjualan?batas=5");
  cek(
    "RG2",
    "GET /api/penjualan tidak mengirim hppTotal ke kasir",
    listKasir.data?.nota?.every((n) => n.hppTotal === null),
    `contoh hppTotal: ${listKasir.data?.nota?.[0]?.hppTotal}`
  );

  const detailKasir = await kasir.get(`/api/penjualan/${idHpp}`);
  const itemKasir = detailKasir.data?.nota?.items?.[0];
  cek(
    "RG3",
    "GET /api/penjualan/[id] tidak membuka HPP maupun konsumsi lot ke kasir",
    itemKasir?.hpp === null && itemKasir?.consumptions === undefined,
    `hpp ${itemKasir?.hpp}, consumptions ${JSON.stringify(itemKasir?.consumptions)}`
  );

  const detailOwner = await owner.get(`/api/penjualan/${idHpp}`);
  cek(
    "RG4",
    "owner tetap melihat HPP dan konsumsi lot secara lengkap",
    detailOwner.data?.nota?.items?.[0]?.hpp > 0 &&
      detailOwner.data?.nota?.items?.[0]?.consumptions?.length > 0
  );

  const hutangKasir = await kasir.get(
    `/api/pembayaran/nota-terbuka?arah=VENDOR&party_id=${vendor.id}`
  );
  cek("RG5", "kasir tidak bisa melihat daftar hutang vendor", hutangKasir.status === 400);

  // R-TZ: batas hari laporan sempat memakai tengah malam UTC (meleset 7 jam).
  const hariIniWIB = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date()
  );
  const { data: labaHariIni } = await owner.get(
    `/api/laporan/laba?dari=${hariIniWIB}&sampai=${hariIniWIB}`
  );
  cek(
    "RG6",
    "periode laporan memakai batas hari WIB, bukan UTC",
    new Date(labaHariIni.periode.dari).toISOString() ===
      new Date(`${hariIniWIB}T00:00:00.000+07:00`).toISOString(),
    `server pakai ${labaHariIni.periode.dari}, seharusnya ${new Date(
      `${hariIniWIB}T00:00:00.000+07:00`
    ).toISOString()}`
  );

  // R-RACE: dua pelunasan bersamaan sempat membuat sisa hutang MINUS.
  const vendorRace = (
    await owner.post("/api/pihak", { tipe: "VENDOR", nama: nama("Vendor Race") })
  ).data.pihak;
  await owner.post("/api/pembelian", {
    vendorId: vendorRace.id,
    cara: "CREDIT",
    tempoHari: 14,
    items: [{ productId: gula.id, qtyBeli: 1, hppTotal: 100000 }],
  });

  const serentak = await Promise.all(
    Array.from({ length: 4 }, () =>
      owner.post("/api/pembayaran", {
        arah: "VENDOR",
        partyId: vendorRace.id,
        nominal: 100000,
      })
    )
  );
  const berhasil = serentak.filter((r) => r.status === 201).length;
  cek(
    "RG7",
    "4 pelunasan bersamaan atas hutang 100.000 -> hanya 1 yang lolos",
    berhasil === 1,
    `berhasil ${berhasil}`
  );

  const { data: hutangRace } = await owner.get("/api/laporan/hutang");
  cek(
    "RG8",
    "tidak ada nota dengan sisa hutang minus",
    hutangRace.hutang.every((h) => h.sisaHutang >= 0)
  );

  // R-500: input ngawur harus 400 berpesan, bukan 500 "kesalahan di server".
  const ngawur = [
    ["cara bayar ngawur", await kasir.post("/api/penjualan", {
      customerId: umum.id, cara: "BARTER", items: [{ productId: gula.id, qty: "1" }],
    })],
    ["harga jual 0", await kasir.post("/api/penjualan", {
      customerId: umum.id, cara: "CASH", items: [{ productId: gula.id, qty: "1", hargaRef: 0 }],
    })],
    ["harga jual negatif", await kasir.post("/api/penjualan", {
      customerId: umum.id, cara: "CASH", items: [{ productId: gula.id, qty: "1", hargaRef: -1 }],
    })],
    ["qty beli melebihi batas kolom", await owner.post("/api/pembelian", {
      vendorId: vendor.id, cara: "CASH",
      items: [{ productId: gula.id, qtyBeli: 100000, hppTotal: 1000 }],
    })],
    ["pembelian bertanggal masa depan", await owner.post("/api/pembelian", {
      vendorId: vendor.id, cara: "CASH", tanggal: "2030-01-01",
      items: [{ productId: gula.id, qtyBeli: 1, hppTotal: 1000 }],
    })],
  ];
  for (const [label, r] of ngawur) {
    cek(
      `RG9-${label}`,
      "ditolak 400 dengan pesan, bukan 500",
      r.status === 400 && typeof r.data?.error === "string" && r.data.error.length > 10,
      `status ${r.status} — ${r.data?.error}`
    );
  }

  // ---- Ringkasan ---------------------------------------------------------
  console.log(`\n${"=".repeat(64)}`);
  console.log(`LULUS ${lulus}   GAGAL ${gagal}`);
  if (kegagalan.length) {
    console.log("\nYang gagal:");
    for (const k of kegagalan) console.log(`  - ${k}`);
  }
  console.log("=".repeat(64));

  process.exit(gagal === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("\nSkrip berhenti karena error tak terduga:", e);
  process.exit(1);
});
