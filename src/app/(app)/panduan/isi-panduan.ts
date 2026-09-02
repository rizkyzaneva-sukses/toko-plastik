/**
 * Isi Panduan Pemakaian — dipisah dari komponennya supaya gampang dikoreksi
 * tanpa menyentuh tata letak.
 *
 * ATURAN MENULIS DI FILE INI:
 * Panduan harus menggambarkan apa yang APLIKASI INI benar-benar lakukan.
 * Kalau suatu fitur tidak ada, tulis di daftar "Belum ada di V1" beserta cara
 * kerja manualnya — jangan dijanjikan. Panduan yang menyebut fitur yang tidak
 * ada lebih berbahaya daripada tidak ada panduan sama sekali.
 */

export type Peran = "OWNER" | "KASIR" | "KEDUANYA";

export interface LangkahAwal {
  judul: string;
  jalur: string[];
  peran: Peran;
  penjelasan: string;
}

/** PRD pasal 12 — urutan go-live. Nomornya berarti; jangan diacak. */
export const LANGKAH_AWAL: LangkahAwal[] = [
  {
    judul: "Daftarkan barang dan konversinya",
    jalur: ["Master", "Barang", "Tambah barang"],
    peran: "OWNER",
    penjelasan:
      "Isi nama, merek, satuan dasar, dan konversi beli. Contoh: 1 karung gula = 50000 gram. " +
      "Merek berbeda dihitung sebagai barang berbeda, jadi Gulaku dan Rose Brand didaftarkan terpisah. " +
      "Untuk plastik dan barang pcs, konversinya selalu 1.",
  },
  {
    judul: "Daftarkan vendor dan customer",
    jalur: ["Master", "Vendor & Customer"],
    peran: "OWNER",
    penjelasan:
      "Vendor untuk tempat belanja, customer untuk pembeli yang berhutang. " +
      "Customer UMUM sudah tersedia sejak awal dan dipakai untuk semua penjualan tunai tanpa nama.",
  },
  {
    judul: "Masukkan stok awal hasil hitung fisik",
    jalur: ["Stok", "Stok awal"],
    peran: "OWNER",
    penjelasan:
      "Hitung fisik semua barang di hari go-live, lalu masukkan qty-nya. HPP boleh taksiran. " +
      "Qty harus tepat — kalau qty awal salah, seluruh laporan stok ikut salah selamanya. " +
      "Satu barang hanya bisa diisi stok awal sekali.",
  },
  {
    judul: "Masukkan saldo kas awal",
    jalur: ["Kas", "Saldo kas awal"],
    peran: "OWNER",
    penjelasan:
      "Hitung uang fisik di laci, masukkan sebagai saldo awal. Hanya bisa sekali. " +
      "Tanpa langkah ini, saldo kas akan tampak minus begitu Anda mulai mencatat pembelian.",
  },
  {
    judul: "Masukkan hutang vendor yang masih terbuka",
    jalur: ["Beli", "Nota baru", "Kredit"],
    peran: "OWNER",
    penjelasan:
      "Catat sebagai pembelian kredit dengan nominal sisa yang sebenarnya dan tempo yang tersisa. " +
      "Lewati langkah ini kalau tidak ada hutang berjalan.",
  },
  {
    judul: "Masukkan piutang customer yang masih terbuka",
    jalur: ["Jual", "Kredit"],
    peran: "OWNER",
    penjelasan:
      "Catat sebagai penjualan kredit atas nama customer bersangkutan. " +
      "Lewati kalau tidak ada piutang berjalan.",
  },
  {
    judul: "Ganti password owner dan kasir",
    jalur: ["Master", "Pengguna"],
    peran: "OWNER",
    penjelasan:
      "Password bawaan admin123 dan kasir123 hanya untuk pemasangan pertama. " +
      "Ganti keduanya sebelum aplikasi dipakai berjualan.",
  },
];

// ---------------------------------------------------------------------------

export interface Alur {
  judul: string;
  peran: Peran;
  jalur: string;
  langkah: string[];
  catatan?: string;
}

export const ALUR: Alur[] = [
  {
    judul: "Jual eceran tunai",
    peran: "KEDUANYA",
    jalur: "Jual",
    langkah: [
      "Cari barang lewat kotak pencarian.",
      "Tekan tombol qty cepat (100 g / 250 g / 500 g / 1 kg), atau ketik qty sendiri dalam gram bulat.",
      "Harga sudah terisi otomatis dari master; boleh diubah kalau perlu.",
      "Tekan Tambah ke nota. Ulangi untuk barang lain.",
      "Pastikan Cash terpilih dan customer UMUM, lalu tekan Bayar.",
      "Nomor nota muncul di layar. Tunjukkan ke pembeli kalau diminta.",
    ],
    catatan:
      "Qty desimal ditolak. 0,25 kg harus ditulis 250. Tombol 1 kg pun tersimpan sebagai 1000 gram.",
  },
  {
    judul: "Jual kredit (bon)",
    peran: "KEDUANYA",
    jalur: "Jual",
    langkah: [
      "Susun isi nota seperti penjualan biasa.",
      "Di bagian Pembayaran, pilih Kredit.",
      "Pilih customer bernama. UMUM tidak bisa dipakai untuk kredit.",
      "Isi tempo dalam hari, lalu tekan Bayar.",
    ],
    catatan:
      "Kas TIDAK bertambah saat nota kredit dibuat. Kas baru naik saat pelunasannya diterima.",
  },
  {
    judul: "Belanja ke vendor",
    peran: "OWNER",
    jalur: "Beli",
    langkah: [
      "Pilih vendor.",
      "Pilih barang, isi qty dalam satuan beli (berapa karung / dus / iket), dan total harga baris itu.",
      "Layar menunjukkan berapa gram atau iket yang akan masuk stok. Periksa angkanya.",
      "Tekan Tambah baris. Ulangi untuk barang lain di nota yang sama.",
      "Pilih Cash atau Kredit. Kalau kredit, isi tempo hari.",
      "Tekan Simpan nota.",
    ],
    catatan:
      "Ongkir dan kuli JANGAN dimasukkan ke harga beli. Catat terpisah di menu Kas sebagai biaya operasional.",
  },
  {
    judul: "Terima cicilan dari customer",
    peran: "KEDUANYA",
    jalur: "Hutang / Piutang",
    langkah: [
      "Pilih customer yang membayar.",
      "Layar menampilkan nota-nota terbuka, tertua di atas.",
      "Isi nominal yang benar-benar diterima.",
      "Periksa rincian pembagiannya — uang selalu masuk ke nota tertua dulu.",
      "Tekan Terima uang.",
    ],
    catatan:
      "Kelebihan bayar ditolak, tidak disimpan sebagai saldo. Kalau customer membayar lebih, kembalikan uangnya.",
  },
  {
    judul: "Bayar cicilan ke vendor",
    peran: "OWNER",
    jalur: "Hutang / Piutang",
    langkah: [
      "Pilih tab Bayar hutang vendor.",
      "Pilih vendor, periksa daftar nota terbukanya.",
      "Isi nominal yang dibayar, periksa pembagiannya, lalu tekan Bayar sekarang.",
    ],
    catatan: "Kasir tidak bisa melakukan ini. Keputusan mengeluarkan uang ada di owner.",
  },
  {
    judul: "Catat biaya operasional",
    peran: "OWNER",
    jalur: "Kas",
    langkah: [
      "Pilih kategori (ongkir, kuli, listrik, sewa, transport, lain-lain).",
      "Isi nominal dan keterangan yang jelas.",
      "Tekan Catat biaya.",
    ],
    catatan: "Biaya operasional mengurangi kas, tapi TIDAK mengubah HPP barang.",
  },
  {
    judul: "Owner mengambil uang",
    peran: "OWNER",
    jalur: "Pinjaman Owner",
    langkah: [
      "Pilih Owner ambil uang.",
      "Isi nominal dan catatan keperluannya.",
      "Tekan Catat pengambilan.",
    ],
    catatan:
      "Ini dicatat sebagai utang owner ke toko, bukan pembagian laba. " +
      "Saat uangnya dikembalikan, catat lewat Owner kembalikan.",
  },
  {
    judul: "Opname stok dua mingguan",
    peran: "OWNER",
    jalur: "Stok → Susut / Rusak / Opname",
    langkah: [
      "Hitung fisik satu barang sampai selesai sebelum membukanya di aplikasi.",
      "Pilih barang, pilih alasan Opname.",
      "Isi qty fisik hasil hitungan. Boleh 0 kalau memang habis.",
      "Tulis catatan yang bisa dibaca ulang bulan depan.",
      "Tekan Simpan penyesuaian.",
    ],
    catatan:
      "Sistem menghitung sendiri selisihnya terhadap stok tercatat. " +
      "Penyesuaian tidak bisa disimpan tanpa alasan tertulis.",
  },
  {
    judul: "Membatalkan nota yang salah",
    peran: "OWNER",
    jalur: "Nota Jual → Void",
    langkah: [
      "Buka Nota Jual, cari notanya.",
      "Tekan Void, tulis alasannya.",
      "Konfirmasi.",
    ],
    catatan:
      "Nota tidak pernah terhapus, hanya ditandai VOID. Stok kembali ke lot semula dan kas dibalik. " +
      "Nota yang sudah dicicil harus dibatalkan pembayarannya lebih dulu.",
  },
];

// ---------------------------------------------------------------------------

export interface Halaman {
  menu: string;
  peran: Peran;
  untukApa: string;
  perhatikan: string;
}

export const HALAMAN: Halaman[] = [
  {
    menu: "Jual",
    peran: "KEDUANYA",
    untukApa: "Layar kasir. Satu-satunya tempat penjualan dicatat.",
    perhatikan:
      "Stok yang ditampilkan sudah dikurangi isi keranjang, jadi angkanya adalah sisa yang benar-benar bisa dijual.",
  },
  {
    menu: "Nota Jual",
    peran: "KEDUANYA",
    untukApa: "Riwayat penjualan dan tempat owner mem-void nota yang salah.",
    perhatikan:
      "Kasir bisa melihat notanya, tapi kolom laba kotor dan HPP tidak ditampilkan untuk kasir.",
  },
  {
    menu: "Stok",
    peran: "KEDUANYA",
    untukApa:
      "Sisa stok per barang, antrian lot FIFO, penyesuaian susut/rusak/opname, dan pengisian stok awal.",
    perhatikan:
      "Kasir hanya melihat qty. Nilai rupiah stok, rincian lot, dan menu penyesuaian khusus owner.",
  },
  {
    menu: "Beli",
    peran: "OWNER",
    untukApa: "Mencatat pembelian ke vendor. Setiap baris membentuk satu lot FIFO baru.",
    perhatikan:
      "Harga beli yang diisi di sini menjadi HPP. Salah ketik di sini membuat laba seluruh nota berikutnya ikut salah.",
  },
  {
    menu: "Hutang / Piutang",
    peran: "KEDUANYA",
    untukApa: "Menerima pelunasan piutang customer dan membayar hutang vendor.",
    perhatikan:
      "Kasir hanya bisa menerima uang dari customer. Daftar hutang ke vendor tidak dibuka untuk kasir.",
  },
  {
    menu: "Kas",
    peran: "OWNER",
    untukApa: "Saldo kas berjalan, mutasi per tanggal, entri biaya operasional, dan saldo kas awal.",
    perhatikan:
      "Setiap baris di sini adalah uang yang benar-benar berpindah. Tidak ada baris yang muncul karena perhitungan laba.",
  },
  {
    menu: "Pinjaman Owner",
    peran: "OWNER",
    untukApa: "Mencatat uang yang diambil owner dan yang dikembalikan.",
    perhatikan:
      "Halaman ini sengaja tidak menampilkan laba sama sekali, supaya penarikan uang tidak dibaca sebagai mengambil bagian laba.",
  },
  {
    menu: "Report",
    peran: "OWNER",
    untukApa:
      "Laba kotor FIFO per periode, nilai stok, saldo kas, hutang, piutang, dan saldo pinjaman owner.",
    perhatikan:
      "Laba kotor bisa lebih besar dari kas. Yang menentukan berapa uang yang boleh diambil adalah saldo kas, bukan laba.",
  },
  {
    menu: "Master",
    peran: "OWNER",
    untukApa: "Barang dan konversinya, vendor, customer, dan pengguna aplikasi.",
    perhatikan:
      "Mengubah konversi TIDAK menghitung ulang stok dan lot yang sudah ada. Konversi baru hanya berlaku untuk pembelian berikutnya.",
  },
  {
    menu: "Audit Log",
    peran: "OWNER",
    untukApa: "Catatan siapa mengubah apa dan kapan, lengkap dengan nilai lama dan barunya.",
    perhatikan: "Isinya tidak bisa diedit maupun dihapus dari aplikasi mana pun.",
  },
];

// ---------------------------------------------------------------------------

export interface AturanHitung {
  judul: string;
  isi: string;
  contoh?: string;
}

export const ATURAN_HITUNG: AturanHitung[] = [
  {
    judul: "Satuan selalu bilangan bulat",
    isi:
      "Bahan kue yang dipecah memakai gram bulat, plastik memakai iket, barang utuh memakai pcs. " +
      "Input berdesimal ditolak, bukan dibulatkan diam-diam.",
    contoh: "0,25 kg ditolak. Yang benar: 250. Tombol 1 kg tersimpan sebagai 1000 gram.",
  },
  {
    judul: "Harga jual ditulis per satuan referensi",
    isi:
      "Harga disimpan sebagai sekian rupiah per sekian satuan dasar, supaya harga per gram yang berkoma tetap terhitung tanpa desimal.",
    contoh: "Rp 13.500 per 1.000 g. Jual 250 g = 13.500 x 250 / 1.000 = Rp 3.375.",
  },
  {
    judul: "HPP mengikuti FIFO, lot tertua dipotong dulu",
    isi:
      "Setiap baris pembelian membentuk satu lot dengan harganya sendiri. Penjualan, susut, rusak, " +
      "dan opname kurang selalu memotong lot yang paling lama masuk lebih dulu. Harga beli baru tidak " +
      "mengubah harga lot lama.",
    contoh:
      "Beli 50 kg @ Rp 12.000/kg lalu 50 kg @ Rp 14.000/kg. Jual 60 kg: " +
      "50 kg dihitung Rp 12.000 dan 10 kg dihitung Rp 14.000. Sisa 40 kg tetap seharga Rp 14.000/kg.",
  },
  {
    judul: "Nilai stok = jumlah sisa nilai semua lot",
    isi:
      "Bukan qty dikali harga rata-rata, melainkan jumlah nilai yang benar-benar tersisa di tiap lot. " +
      "Angkanya selalu cocok dengan HPP yang sudah keluar.",
  },
  {
    judul: "Laba kotor = harga jual dikurangi HPP FIFO",
    isi:
      "Dihitung per baris nota, hanya untuk nota yang tidak void. Kerugian stok dan biaya operasional " +
      "ditampilkan terpisah karena keduanya tidak mengubah HPP.",
  },
  {
    judul: "Kas hanya bergerak kalau uang benar-benar berpindah",
    isi:
      "Jual tunai menambah kas. Jual kredit tidak. Beli tunai mengurangi kas. Beli kredit tidak. " +
      "Kas bergerak untuk nota kredit hanya saat pelunasannya dicatat.",
  },
  {
    judul: "Ongkir dan kuli bukan HPP",
    isi:
      "Biaya pengiriman, kuli, listrik, dan sejenisnya mengurangi kas sebagai biaya operasional, " +
      "tapi tidak menempel ke harga pokok barang.",
  },
  {
    judul: "Pengambilan owner adalah pinjaman",
    isi:
      "Uang yang diambil owner mengurangi kas dan menambah utang owner ke toko. " +
      "Sistem tidak memeriksa apakah toko sudah untung, dan tidak menghitung jatah owner dari margin.",
  },
  {
    judul: "Stok tidak pernah boleh minus",
    isi:
      "Kalau qty yang diminta melebihi stok, SELURUH nota ditolak — bukan disimpan sebagian. " +
      "Aturan yang sama berlaku untuk susut dan opname.",
  },
  {
    judul: "Uang yang dibayar tidak boleh mengendap",
    isi:
      "Pelunasan selalu dialokasikan ke nota tertua lebih dulu, dan pembagiannya ditampilkan sebelum disimpan. " +
      "Nominal yang melebihi total tagihan ditolak, bukan disimpan sebagai saldo mengambang.",
  },
  {
    judul: "Tanggal dan jam memakai WIB",
    isi:
      "Semua laporan, penomoran nota, dan angka hari ini memakai batas hari WIB, " +
      "walaupun server aplikasinya berjalan di zona waktu lain.",
  },
];

// ---------------------------------------------------------------------------

export interface BarisCakupan {
  kebutuhan: string;
  dikerjakanDi: string;
  peran: Peran;
}

export const CAKUPAN: BarisCakupan[] = [
  { kebutuhan: "Beli bahan kue atau plastik dari vendor, tunai", dikerjakanDi: "Beli", peran: "OWNER" },
  { kebutuhan: "Beli dari vendor secara kredit dengan tempo hari", dikerjakanDi: "Beli", peran: "OWNER" },
  { kebutuhan: "Jual eceran gram bulat (gula, tepung, mentega)", dikerjakanDi: "Jual", peran: "KEDUANYA" },
  { kebutuhan: "Jual plastik per iket", dikerjakanDi: "Jual", peran: "KEDUANYA" },
  { kebutuhan: "Jual barang utuh per pcs", dikerjakanDi: "Jual", peran: "KEDUANYA" },
  { kebutuhan: "Jual bon / kredit ke pembeli bernama", dikerjakanDi: "Jual (pilih Kredit)", peran: "KEDUANYA" },
  { kebutuhan: "Ubah harga jual pada satu nota tertentu", dikerjakanDi: "Jual (kolom harga)", peran: "KEDUANYA" },
  { kebutuhan: "Lihat riwayat nota penjualan", dikerjakanDi: "Nota Jual", peran: "KEDUANYA" },
  { kebutuhan: "Membatalkan nota jual yang salah", dikerjakanDi: "Nota Jual (Void)", peran: "OWNER" },
  { kebutuhan: "Membatalkan nota beli yang salah", dikerjakanDi: "Beli (Void)", peran: "OWNER" },
  { kebutuhan: "Terima cicilan atau pelunasan piutang customer", dikerjakanDi: "Hutang / Piutang", peran: "KEDUANYA" },
  { kebutuhan: "Bayar cicilan atau pelunasan hutang vendor", dikerjakanDi: "Hutang / Piutang", peran: "OWNER" },
  { kebutuhan: "Lihat umur hutang dan piutang terhadap tempo", dikerjakanDi: "Hutang / Piutang", peran: "KEDUANYA" },
  { kebutuhan: "Catat biaya operasional (ongkir, kuli, listrik, sewa)", dikerjakanDi: "Kas", peran: "OWNER" },
  { kebutuhan: "Lihat saldo kas dan mutasinya per tanggal", dikerjakanDi: "Kas", peran: "OWNER" },
  { kebutuhan: "Catat saldo kas awal saat pertama pakai", dikerjakanDi: "Kas (Saldo kas awal)", peran: "OWNER" },
  { kebutuhan: "Owner mengambil uang dari toko", dikerjakanDi: "Pinjaman Owner", peran: "OWNER" },
  { kebutuhan: "Owner mengembalikan uang ke toko", dikerjakanDi: "Pinjaman Owner", peran: "OWNER" },
  { kebutuhan: "Catat barang susut saat ditakar ulang", dikerjakanDi: "Stok (Susut)", peran: "OWNER" },
  { kebutuhan: "Catat barang rusak atau tidak layak jual", dikerjakanDi: "Stok (Rusak)", peran: "OWNER" },
  { kebutuhan: "Opname stok dua mingguan", dikerjakanDi: "Stok (Opname)", peran: "OWNER" },
  { kebutuhan: "Masukkan stok fisik awal saat pertama pakai", dikerjakanDi: "Stok (Stok awal)", peran: "OWNER" },
  { kebutuhan: "Lihat antrian lot FIFO dan HPP tiap lot", dikerjakanDi: "Stok (kolom Lot)", peran: "OWNER" },
  { kebutuhan: "Tambah barang, merek, atau ubah konversi", dikerjakanDi: "Master (Barang)", peran: "OWNER" },
  { kebutuhan: "Tambah vendor atau customer", dikerjakanDi: "Master (Vendor & Customer)", peran: "OWNER" },
  { kebutuhan: "Tambah akun kasir atau ganti password", dikerjakanDi: "Master (Pengguna)", peran: "OWNER" },
  { kebutuhan: "Lihat laba kotor FIFO per periode", dikerjakanDi: "Report", peran: "OWNER" },
  { kebutuhan: "Lihat nilai stok dan empat angka utama", dikerjakanDi: "Report", peran: "OWNER" },
  { kebutuhan: "Telusuri siapa mengubah apa dan kapan", dikerjakanDi: "Audit Log", peran: "OWNER" },
];

// ---------------------------------------------------------------------------

export interface Batasan {
  hal: string;
  alasan: string;
  gantinya: string;
}

/**
 * Daftar ini yang membedakan panduan jujur dari brosur. Semua yang ada di sini
 * memang TIDAK dibangun, dan alasannya ada di PRD.
 */
export const BATASAN: Batasan[] = [
  {
    hal: "Rekonsiliasi kas harian (hitung laci saat tutup toko)",
    alasan:
      "Tidak ada di PRD V1. PRD hanya mengunci opname stok dua mingguan, tidak mengunci pemeriksaan laci harian.",
    gantinya:
      "Buka Kas, bandingkan Saldo kas sekarang dengan uang fisik di laci. Kalau berbeda, telusuri Mutasi kas " +
      "hari itu untuk mencari transaksi yang belum tercatat. Aplikasi sengaja tidak menyediakan tombol untuk " +
      "menyimpan selisihnya, supaya selisih tidak bisa ditelan diam-diam tanpa dicari sebabnya.",
  },
  {
    hal: "Retur pembelian dan retur penjualan",
    alasan: "Dilarang di V1 oleh PRD pasal 4.3.",
    gantinya:
      "Barang yang batal dibeli atau dikembalikan pembeli dikoreksi lewat Void oleh owner (kalau notanya masih utuh) " +
      "atau lewat Penyesuaian Stok dengan alasan tertulis.",
  },
  {
    hal: "Cetak struk thermal",
    alasan: "Dilewati di V1 oleh PRD pasal 5.",
    gantinya: "Nomor nota tampil di layar setelah pembayaran; tunjukkan itu kalau pembeli meminta bukti.",
  },
  {
    hal: "PPN, faktur pajak, dan laporan PKP",
    alasan: "V1 diperlakukan sebagai UMKM non-PPN (PRD pasal 5).",
    gantinya: "Tidak ada. Kalau nanti jadi PKP, ini perlu dibangun sebagai versi baru.",
  },
  {
    hal: "Promo, bonus, cashback, dan harga grosir otomatis",
    alasan: "Dikecualikan PRD pasal 2.2 dan pasal 15.",
    gantinya:
      "Harga bisa diubah manual per nota di layar kasir, dan harga yang dipakai tersimpan di nota itu. " +
      "Menjual dengan harga Rp 0 ditolak; barang yang benar-benar diberikan gratis dicatat lewat Penyesuaian Stok.",
  },
  {
    hal: "Tanggal kedaluwarsa barang",
    alasan: "Tidak dikelola di V1 (PRD pasal 4.5).",
    gantinya: "Barang yang telanjur kedaluwarsa dicatat lewat Penyesuaian Stok dengan alasan Rusak.",
  },
  {
    hal: "Memecah karung menjadi SKU eceran baru",
    alasan: "Dikecualikan PRD pasal 2.2.",
    gantinya:
      "Karung tidak dipecah menjadi barang baru. Yang berkurang hanya qty stok dalam satuan dasar saat barang laku.",
  },
  {
    hal: "Tutup buku bulanan formal, neraca, jurnal umum",
    alasan: "V1 bukan software akuntansi lengkap (PRD pasal 2.2 dan pasal 15).",
    gantinya: "Report menyediakan laba kotor per periode, nilai stok, kas, hutang, dan piutang.",
  },
  {
    hal: "Jatah owner sekian persen dari margin",
    alasan: "Dibatalkan PRD pasal 4.4 dan tidak boleh diselundupkan ke V1.",
    gantinya: "Setiap pengambilan uang dicatat sebagai pinjaman owner, apa pun angka labanya.",
  },
  {
    hal: "Mode offline",
    alasan: "Dikecualikan PRD pasal 2.2.",
    gantinya: "Aplikasi butuh internet. Kalau koneksi putus, penjualan tidak bisa disimpan.",
  },
  {
    hal: "Multi-cabang dan multi-kas",
    alasan: "Dikecualikan PRD pasal 2.2.",
    gantinya: "V1 melayani satu toko dengan satu kas.",
  },
  {
    hal: "Input berat dalam kg berdesimal",
    alasan: "Dilarang keras PRD pasal 4.1.",
    gantinya: "Tulis dalam gram bulat. 0,25 kg ditulis 250, 1,5 kg ditulis 1500.",
  },
];
