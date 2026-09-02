/**
 * Layar kasir — PRD pasal 8.
 *
 * "Kasir: satu layar jual. Cari cepat. Tombol gram. Total besar. Konfirmasi
 *  bayar. Jangan menu akuntansi."
 *
 * Stok ditampilkan dalam satuan jual (g / iket), bukan "0,05 karung" (pasal 8).
 * Label "1 kg" hanya pada tombol 1000 g; yang tersimpan tetap 1000 gram.
 */

"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Check, Receipt } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Card,
  CardJudul,
  Tombol,
  Input,
  Field,
  Kosong,
  Galat,
  SkeletonTabel,
  Peringatan,
  Badge,
} from "@/components/ui/dasar";
import { fetchJson, formatRupiah, formatAngka } from "@/lib/utils";
import { formatQtyPanjang, tombolCepat, SATUAN_LABEL, type SatuanDasar } from "@/lib/satuan";

interface Produk {
  id: string;
  nama: string;
  merek: string;
  satuanDasar: SatuanDasar;
  hargaJualDefault: number;
  hargaJualPerQty: number;
  stokQty: number;
}

interface Pihak {
  id: string;
  nama: string;
  isSystem: boolean;
}

interface BarisKeranjang {
  key: string;
  produk: Produk;
  qty: number;
  hargaRef: number;
}

interface NotaTersimpan {
  nomor: string;
  total: number;
  cara: "CASH" | "CREDIT";
  customer: { nama: string };
  items: { qty: number; subtotal: number; product: { nama: string; merek: string; satuanDasar: SatuanDasar } }[];
}

/** Subtotal di layar memakai rumus yang sama persis dengan server. */
function subtotalBaris(b: BarisKeranjang) {
  return Math.round((b.hargaRef * b.qty) / b.produk.hargaJualPerQty);
}

export function LayarKasir() {
  const qc = useQueryClient();

  const produkQ = useQuery({
    queryKey: ["produk"],
    queryFn: () => fetchJson<{ produk: Produk[] }>("/api/produk"),
  });
  const pihakQ = useQuery({
    queryKey: ["pihak", "CUSTOMER"],
    queryFn: () => fetchJson<{ pihak: Pihak[] }>("/api/pihak?tipe=CUSTOMER"),
  });

  const [keranjang, setKeranjang] = React.useState<BarisKeranjang[]>([]);
  const [produkId, setProdukId] = React.useState<string | null>(null);
  const [qtyTeks, setQtyTeks] = React.useState("");
  const [hargaTeks, setHargaTeks] = React.useState("");
  const [errorBaris, setErrorBaris] = React.useState<string | null>(null);

  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [cara, setCara] = React.useState<"CASH" | "CREDIT">("CASH");
  const [tempoHari, setTempoHari] = React.useState("7");
  const [notaSelesai, setNotaSelesai] = React.useState<NotaTersimpan | null>(null);

  const produkList = produkQ.data?.produk ?? [];
  const pihakList = pihakQ.data?.pihak ?? [];
  const produkTerpilih = produkList.find((p) => p.id === produkId) ?? null;
  const customerTerpilih = pihakList.find((p) => p.id === customerId) ?? null;

  // Default customer = UMUM (PRD pasal 3).
  React.useEffect(() => {
    if (!customerId && pihakList.length > 0) {
      setCustomerId(pihakList.find((p) => p.isSystem)?.id ?? pihakList[0].id);
    }
  }, [pihakList, customerId]);

  // Harga default ikut barang yang dipilih; kasir tetap boleh mengubahnya.
  React.useEffect(() => {
    if (produkTerpilih) setHargaTeks(String(produkTerpilih.hargaJualDefault));
    setErrorBaris(null);
  }, [produkId]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = keranjang.reduce((a, b) => a + subtotalBaris(b), 0);

  // Sisa stok setelah dikurangi isi keranjang — supaya kasir tahu sebelum simpan.
  function stokSisa(p: Produk) {
    const dipakai = keranjang
      .filter((b) => b.produk.id === p.id)
      .reduce((a, b) => a + b.qty, 0);
    return p.stokQty - dipakai;
  }

  function tambahBaris(qtyPaksa?: number) {
    setErrorBaris(null);

    if (!produkTerpilih) {
      setErrorBaris("Pilih barang dulu");
      return;
    }

    const teks = qtyPaksa !== undefined ? String(qtyPaksa) : qtyTeks.trim();

    // Gerbang pasal 4.1 di layar. Server memvalidasi ulang — ini hanya supaya
    // kasir dapat pesan cepat tanpa menunggu jaringan.
    if (!teks) {
      setErrorBaris("Qty wajib diisi");
      return;
    }
    if (/[.,]/.test(teks)) {
      setErrorBaris(
        produkTerpilih.satuanDasar === "GRAM"
          ? "Qty desimal tidak diterima. Tulis gram bulat, contoh 250 (bukan 0,25 kg)."
          : `Qty desimal tidak diterima. Tulis ${SATUAN_LABEL[produkTerpilih.satuanDasar]} bulat.`
      );
      return;
    }

    const qty = Number(teks);
    if (!Number.isInteger(qty) || qty <= 0) {
      setErrorBaris("Qty harus bilangan bulat lebih dari 0");
      return;
    }

    const sisa = stokSisa(produkTerpilih);
    if (qty > sisa) {
      setErrorBaris(
        `Stok tidak cukup. Sisa ${formatQtyPanjang(sisa, produkTerpilih.satuanDasar)}.`
      );
      return;
    }

    const harga = Number(hargaTeks);
    if (!Number.isInteger(harga) || harga < 0) {
      setErrorBaris("Harga harus rupiah bulat, tanpa desimal");
      return;
    }

    setKeranjang((k) => [
      ...k,
      { key: `${Date.now()}-${Math.random()}`, produk: produkTerpilih, qty, hargaRef: harga },
    ]);
    setQtyTeks("");
  }

  const simpan = useMutation({
    mutationFn: () =>
      fetchJson<{ nota: NotaTersimpan }>("/api/penjualan", {
        method: "POST",
        body: JSON.stringify({
          customerId,
          cara,
          tempoHari: cara === "CREDIT" ? Number(tempoHari) : 0,
          items: keranjang.map((b) => ({
            productId: b.produk.id,
            qty: String(b.qty),
            hargaRef: b.hargaRef,
          })),
        }),
      }),
    onSuccess: (data) => {
      setNotaSelesai(data.nota);
      setKeranjang([]);
      setProdukId(null);
      setQtyTeks("");
      setCara("CASH");
      toast.success(`Nota ${data.nota.nomor} tersimpan`);
      qc.invalidateQueries({ queryKey: ["produk"] });
      qc.invalidateQueries({ queryKey: ["ringkasan"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const kreditKeUmum = cara === "CREDIT" && customerTerpilih?.isSystem;

  if (produkQ.isLoading || pihakQ.isLoading) {
    return (
      <Card>
        <SkeletonTabel baris={6} />
      </Card>
    );
  }

  if (produkQ.isError) {
    return (
      <Card>
        <Galat pesan={(produkQ.error as Error).message} onCoba={() => produkQ.refetch()} />
      </Card>
    );
  }

  if (produkList.length === 0) {
    return (
      <Card>
        <Kosong
          pesan="Belum ada barang di master"
          keterangan="Owner perlu mengisi master barang dan stok awal dulu sebelum kasir bisa menjual."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      {notaSelesai && (
        <Card className="border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20">
          <div className="flex items-start gap-3">
            <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-green-700 dark:text-green-300" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-green-900 dark:text-green-100">
                Nota {notaSelesai.nomor} tersimpan
              </p>
              <p className="mt-0.5 text-sm text-green-900 dark:text-green-100">
                {notaSelesai.customer.nama} &middot;{" "}
                {notaSelesai.cara === "CASH" ? "Cash" : "Kredit"} &middot;{" "}
                <span className="font-semibold">{formatRupiah(notaSelesai.total)}</span>
              </p>
              <ul className="mt-2 space-y-0.5 text-sm text-green-900 dark:text-green-100">
                {notaSelesai.items.map((it, i) => (
                  <li key={i}>
                    {it.product.nama} {it.product.merek} &mdash;{" "}
                    {formatQtyPanjang(it.qty, it.product.satuanDasar)} ={" "}
                    {formatRupiah(it.subtotal)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-green-800 dark:text-green-200">
                Struk tidak dicetak di V1. Nomor nota cukup ditunjukkan di layar.
              </p>
            </div>
            <Tombol varian="sekunder" onClick={() => setNotaSelesai(null)}>
              Tutup
            </Tombol>
          </div>
        </Card>
      )}

      <Card>
        <CardJudul judul="Tambah barang" keterangan="Cari barang, tekan tombol qty, lalu Tambah" />

        <div className="space-y-3">
          <SearchableSelect
            label="Barang"
            required
            value={produkId}
            onChange={setProdukId}
            placeholder="Pilih barang"
            searchPlaceholder="Ketik nama atau merek..."
            emptyText="Barang tidak ditemukan"
            options={produkList.map((p) => ({
              value: p.id,
              label: `${p.nama} ${p.merek}`,
              hint: `Sisa ${formatQtyPanjang(stokSisa(p), p.satuanDasar)} · ${formatRupiah(
                p.hargaJualDefault
              )} / ${p.hargaJualPerQty === 1 ? SATUAN_LABEL[p.satuanDasar] : formatAngka(p.hargaJualPerQty) + " " + SATUAN_LABEL[p.satuanDasar]}`,
              disabled: stokSisa(p) <= 0,
            }))}
          />

          {produkTerpilih && (
            <>
              <div className="flex flex-wrap gap-2">
                {tombolCepat(produkTerpilih.satuanDasar).map((t) => (
                  <button
                    key={t.qty}
                    type="button"
                    onClick={() => tambahBaris(t.qty)}
                    className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold
                               text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800
                               dark:text-gray-50 dark:hover:bg-zinc-700"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={`Qty (${SATUAN_LABEL[produkTerpilih.satuanDasar]})`}
                  bantuan={
                    produkTerpilih.satuanDasar === "GRAM"
                      ? "Gram bulat. 0,25 kg ditolak — tulis 250."
                      : `${SATUAN_LABEL[produkTerpilih.satuanDasar]} bulat.`
                  }
                >
                  <Input
                    inputMode="numeric"
                    value={qtyTeks}
                    onChange={(e) => setQtyTeks(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && tambahBaris()}
                    placeholder={produkTerpilih.satuanDasar === "GRAM" ? "250" : "1"}
                  />
                </Field>

                <Field
                  label={`Harga per ${
                    produkTerpilih.hargaJualPerQty === 1
                      ? SATUAN_LABEL[produkTerpilih.satuanDasar]
                      : `${formatAngka(produkTerpilih.hargaJualPerQty)} ${SATUAN_LABEL[produkTerpilih.satuanDasar]}`
                  }`}
                  bantuan="Boleh diubah. Harga yang dipakai tersimpan di nota."
                >
                  <Input
                    inputMode="numeric"
                    value={hargaTeks}
                    onChange={(e) => setHargaTeks(e.target.value)}
                  />
                </Field>
              </div>

              {errorBaris && <Peringatan nada="bahaya">{errorBaris}</Peringatan>}

              <Tombol onClick={() => tambahBaris()} className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Tambah ke nota
              </Tombol>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardJudul judul="Isi nota" />

        {keranjang.length === 0 ? (
          <Kosong pesan="Nota masih kosong" keterangan="Pilih barang di atas untuk mulai." />
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-zinc-700">
            {keranjang.map((b) => (
              <li key={b.key} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-gray-50">
                    {b.produk.nama} {b.produk.merek}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatQtyPanjang(b.qty, b.produk.satuanDasar)} &times;{" "}
                    {formatRupiah(b.hargaRef)}
                    {b.produk.hargaJualPerQty !== 1 &&
                      ` / ${formatAngka(b.produk.hargaJualPerQty)} ${SATUAN_LABEL[b.produk.satuanDasar]}`}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-gray-900 dark:text-gray-50">
                  {formatRupiah(subtotalBaris(b))}
                </p>
                <button
                  onClick={() => setKeranjang((k) => k.filter((x) => x.key !== b.key))}
                  className="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                  aria-label="Hapus baris"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardJudul judul="Pembayaran" />

        <div className="space-y-3">
          <div className="flex gap-2">
            {(["CASH", "CREDIT"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCara(c)}
                aria-pressed={cara === c}
                className={
                  cara === c
                    ? "min-h-11 flex-1 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white dark:bg-blue-500"
                    : "min-h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-gray-50 dark:hover:bg-zinc-700"
                }
              >
                {c === "CASH" ? "Cash" : "Kredit"}
              </button>
            ))}
          </div>

          <SearchableSelect
            label="Customer"
            required
            value={customerId}
            onChange={setCustomerId}
            placeholder="Pilih customer"
            emptyText="Customer tidak ditemukan"
            options={pihakList.map((p) => ({
              value: p.id,
              label: p.nama,
              hint: p.isSystem ? "Retail cash tanpa nama — tidak boleh kredit" : undefined,
            }))}
          />

          {cara === "CREDIT" && (
            <Field label="Tempo (hari)" wajib bantuan="Jumlah hari sampai jatuh tempo.">
              <Input
                inputMode="numeric"
                value={tempoHari}
                onChange={(e) => setTempoHari(e.target.value)}
              />
            </Field>
          )}

          {kreditKeUmum && (
            <Peringatan nada="bahaya" judul="Kredit wajib atas nama">
              UMUM hanya untuk penjualan cash. Pilih atau tambahkan customer bernama dulu.
            </Peringatan>
          )}

          {cara === "CREDIT" && !kreditKeUmum && (
            <Peringatan judul="Kas tidak bertambah sekarang">
              Penjualan kredit menambah piutang. Kas baru naik saat pelunasan diterima.
            </Peringatan>
          )}
        </div>
      </Card>

      {/* Bilah total menempel di bawah — tidak tertutup keyboard HP */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Total {keranjang.length > 0 && <Badge>{keranjang.length} baris</Badge>}
            </p>
            <p className="truncate text-2xl font-bold text-gray-900 dark:text-gray-50">
              {formatRupiah(total)}
            </p>
          </div>
          <Tombol
            onClick={() => simpan.mutate()}
            memuat={simpan.isPending}
            disabled={keranjang.length === 0 || !customerId || kreditKeUmum}
            className="min-w-36 text-base"
          >
            <Check className="h-5 w-5" />
            Bayar
          </Tombol>
        </div>
      </div>
    </div>
  );
}
