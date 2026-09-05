/**
 * Pembelian — PRD pasal 6.1.
 *
 * Qty diinput dalam satuan beli (karung / dus / iket), sistem yang mengonversi
 * ke satuan dasar. Harga beli fluktuatif hanya menempel di lot baru; lot lama
 * tidak dihitung ulang (pasal 4.2).
 */

"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Save, Ban } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DialogKonfirmasi } from "@/components/ui/dialog-konfirmasi";
import {
  Card,
  CardJudul,
  Tombol,
  Input,
  TextArea,
  Field,
  Kosong,
  Galat,
  SkeletonTabel,
  Peringatan,
  Tabel,
  Th,
  Td,
  Badge,
  AngkaInput,
  RupiahInput,
} from "@/components/ui/dasar";
import { fetchJson, formatRupiah, formatTanggal, formatAngka, labelTempo } from "@/lib/utils";
import { formatQtyPanjang, SATUAN_LABEL, type SatuanDasar } from "@/lib/satuan";

interface Produk {
  id: string;
  nama: string;
  merek: string;
  satuanDasar: SatuanDasar;
  namaSatuanBeli: string;
  konversiBeli: number;
}

interface Pihak {
  id: string;
  nama: string;
}

interface BarisBeli {
  key: string;
  produk: Produk;
  qtyBeli: number;
  hppTotal: number;
}

interface NotaBeli {
  id: string;
  nomor: string;
  tanggal: string;
  cara: "CASH" | "CREDIT";
  total: number;
  sisaHutang: number;
  status: "AKTIF" | "VOID";
  jatuhTempo: string | null;
  vendor: { nama: string };
  items: {
    id: string;
    qtyBeli: number;
    qtyDasar: number;
    hppTotal: number;
    product: { nama: string; merek: string; satuanDasar: SatuanDasar };
  }[];
}

export function PanelBeli() {
  const qc = useQueryClient();

  const produkQ = useQuery({
    queryKey: ["produk"],
    queryFn: () => fetchJson<{ produk: Produk[] }>("/api/produk"),
  });
  const vendorQ = useQuery({
    queryKey: ["pihak", "VENDOR"],
    queryFn: () => fetchJson<{ pihak: Pihak[] }>("/api/pihak?tipe=VENDOR"),
  });
  const notaQ = useQuery({
    queryKey: ["pembelian"],
    queryFn: () => fetchJson<{ nota: NotaBeli[] }>("/api/pembelian"),
  });

  const [vendorId, setVendorId] = React.useState<string | null>(null);
  const [cara, setCara] = React.useState<"CASH" | "CREDIT">("CASH");
  const [tempoHari, setTempoHari] = React.useState("14");
  const [catatan, setCatatan] = React.useState("");
  const [baris, setBaris] = React.useState<BarisBeli[]>([]);
  const [voidId, setVoidId] = React.useState<string | null>(null);

  const [produkId, setProdukId] = React.useState<string | null>(null);
  const [qtyBeli, setQtyBeli] = React.useState("");
  const [hpp, setHpp] = React.useState("");
  const [errorBaris, setErrorBaris] = React.useState<string | null>(null);

  const produkList = produkQ.data?.produk ?? [];
  const vendorList = vendorQ.data?.pihak ?? [];
  const produkTerpilih = produkList.find((p) => p.id === produkId) ?? null;

  const total = baris.reduce((a, b) => a + b.hppTotal, 0);

  function tambah() {
    setErrorBaris(null);
    if (!produkTerpilih) return setErrorBaris("Pilih barang dulu");

    const q = Number(qtyBeli);
    if (!Number.isInteger(q) || q <= 0) {
      return setErrorBaris(`Qty harus bilangan bulat ${produkTerpilih.namaSatuanBeli}`);
    }
    const h = Number(hpp);
    if (!Number.isInteger(h) || h <= 0) {
      return setErrorBaris("Harga beli harus rupiah bulat lebih dari 0");
    }
    if (!Number.isInteger(produkTerpilih.konversiBeli) || produkTerpilih.konversiBeli <= 0) {
      return setErrorBaris("Konversi barang ini belum diisi di master. Lengkapi dulu.");
    }

    setBaris((b) => [
      ...b,
      { key: `${Date.now()}-${Math.random()}`, produk: produkTerpilih, qtyBeli: q, hppTotal: h },
    ]);
    setQtyBeli("");
    setHpp("");
  }

  const simpan = useMutation({
    mutationFn: () =>
      fetchJson<{ nota: NotaBeli }>("/api/pembelian", {
        method: "POST",
        body: JSON.stringify({
          vendorId,
          cara,
          tempoHari: cara === "CREDIT" ? Number(tempoHari) : 0,
          catatan,
          items: baris.map((b) => ({
            productId: b.produk.id,
            qtyBeli: b.qtyBeli,
            hppTotal: b.hppTotal,
          })),
        }),
      }),
    onSuccess: (d) => {
      toast.success(`Nota ${d.nota.nomor} tersimpan. Lot FIFO baru terbentuk.`);
      setBaris([]);
      setCatatan("");
      setCara("CASH");
      qc.invalidateQueries({ queryKey: ["pembelian"] });
      qc.invalidateQueries({ queryKey: ["produk"] });
      qc.invalidateQueries({ queryKey: ["laporan-stok"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const batalkan = useMutation({
    mutationFn: ({ id, alasan }: { id: string; alasan: string }) =>
      fetchJson(`/api/pembelian/${id}/void`, {
        method: "POST",
        body: JSON.stringify({ alasan }),
      }),
    onSuccess: () => {
      toast.success("Nota di-void. Stok dan kas sudah dibalik, log terisi.");
      setVoidId(null);
      qc.invalidateQueries({ queryKey: ["pembelian"] });
      qc.invalidateQueries({ queryKey: ["laporan-stok"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setVoidId(null);
    },
  });

  if (produkQ.isLoading || vendorQ.isLoading) {
    return (
      <Card>
        <SkeletonTabel baris={6} />
      </Card>
    );
  }

  if (vendorList.length === 0) {
    return (
      <Card>
        <Kosong
          pesan="Belum ada vendor"
          keterangan="Tambahkan vendor dulu di menu Master sebelum mencatat pembelian."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Pembelian</h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          Setiap baris pembelian membentuk satu lot FIFO baru.
        </p>
      </div>

      <Card>
        <CardJudul judul="Nota baru" />

        <div className="space-y-3">
          <SearchableSelect
            label="Vendor"
            required
            value={vendorId}
            onChange={setVendorId}
            placeholder="Pilih vendor"
            emptyText="Vendor tidak ditemukan"
            options={vendorList.map((v) => ({ value: v.id, label: v.nama }))}
          />

          <SearchableSelect
            label="Barang"
            value={produkId}
            onChange={setProdukId}
            placeholder="Pilih barang"
            emptyText="Barang tidak ditemukan"
            options={produkList.map((p) => ({
              value: p.id,
              label: `${p.nama} ${p.merek}`,
              hint: `1 ${p.namaSatuanBeli} = ${formatAngka(p.konversiBeli)} ${SATUAN_LABEL[p.satuanDasar]}`,
            }))}
          />

          {produkTerpilih && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={`Qty (${produkTerpilih.namaSatuanBeli})`}
                  bantuan={`1 ${produkTerpilih.namaSatuanBeli} = ${formatAngka(
                    produkTerpilih.konversiBeli
                  )} ${SATUAN_LABEL[produkTerpilih.satuanDasar]}`}
                >
                  <AngkaInput
                    value={qtyBeli}
                    onChange={setQtyBeli}
                    placeholder="1"
                  />
                </Field>

                <Field
                  label="Total harga beli baris ini"
                  bantuan="Rupiah bulat. Ongkir dan kuli TIDAK dimasukkan di sini."
                >
                  <RupiahInput
                    value={hpp}
                    onChange={setHpp}
                    placeholder="600000"
                  />
                </Field>
              </div>

              {qtyBeli && Number(qtyBeli) > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Masuk stok:{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {formatQtyPanjang(
                      Number(qtyBeli) * produkTerpilih.konversiBeli,
                      produkTerpilih.satuanDasar
                    )}
                  </span>
                </p>
              )}

              {errorBaris && <Peringatan nada="bahaya">{errorBaris}</Peringatan>}

              <Tombol varian="sekunder" onClick={tambah}>
                <Plus className="h-4 w-4" />
                Tambah baris
              </Tombol>
            </>
          )}

          {baris.length > 0 && (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-zinc-700 dark:border-zinc-700">
              {baris.map((b) => (
                <li key={b.key} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-50">
                      {b.produk.nama} {b.produk.merek}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {b.qtyBeli} {b.produk.namaSatuanBeli} ={" "}
                      {formatQtyPanjang(b.qtyBeli * b.produk.konversiBeli, b.produk.satuanDasar)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-gray-900 dark:text-gray-50">
                    {formatRupiah(b.hppTotal)}
                  </p>
                  <button
                    onClick={() => setBaris((k) => k.filter((x) => x.key !== b.key))}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                    aria-label="Hapus baris"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

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

          {cara === "CREDIT" && (
            <>
              <Field label="Tempo (hari)" wajib>
                <Input
                  inputMode="numeric"
                  value={tempoHari}
                  onChange={(e) => setTempoHari(e.target.value)}
                />
              </Field>
              <Peringatan judul="Kas tidak berkurang sekarang">
                Pembelian kredit menambah hutang vendor. Kas baru keluar saat dibayar.
              </Peringatan>
            </>
          )}

          <Field label="Catatan">
            <TextArea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Opsional"
            />
          </Field>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-3 dark:border-zinc-700">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total nota</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-50">
                {formatRupiah(total)}
              </p>
            </div>
            <Tombol
              onClick={() => simpan.mutate()}
              memuat={simpan.isPending}
              disabled={!vendorId || baris.length === 0}
            >
              <Save className="h-4 w-4" />
              Simpan nota
            </Tombol>
          </div>
        </div>
      </Card>

      <Card>
        <CardJudul judul="Nota pembelian terakhir" />

        {notaQ.isLoading ? (
          <SkeletonTabel />
        ) : notaQ.isError ? (
          <Galat pesan={(notaQ.error as Error).message} onCoba={() => notaQ.refetch()} />
        ) : (notaQ.data?.nota.length ?? 0) === 0 ? (
          <Kosong pesan="Belum ada pembelian" />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Tanggal</Th>
                <Th>Nomor</Th>
                <Th>Vendor</Th>
                <Th>Cara</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Sisa hutang</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {notaQ.data?.nota.map((n) => (
                <tr key={n.id}>
                  <Td className="whitespace-nowrap">{formatTanggal(n.tanggal)}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs">{n.nomor}</Td>
                  <Td>{n.vendor.nama}</Td>
                  <Td>
                    {n.status === "VOID" ? (
                      <Badge nada="bahaya">VOID</Badge>
                    ) : n.cara === "CASH" ? (
                      <Badge nada="sukses">Cash</Badge>
                    ) : (
                      <Badge nada="peringatan">
                        Kredit &middot; {labelTempo(n.jatuhTempo)}
                      </Badge>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">{formatRupiah(n.total)}</Td>
                  <Td className="text-right tabular-nums">{formatRupiah(n.sisaHutang)}</Td>
                  <Td>
                    {n.status === "AKTIF" && (
                      <button
                        onClick={() => setVoidId(n.id)}
                        className="inline-flex items-center gap-1 text-sm text-red-700 hover:underline dark:text-red-300"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Void
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        )}
      </Card>

      <DialogKonfirmasi
        buka={Boolean(voidId)}
        onTutup={() => setVoidId(null)}
        judul="Void nota pembelian"
        varian="bahaya"
        labelKonfirmasi="Void nota"
        butuhAlasan
        labelAlasan="Alasan void"
        keterangan={
          <>
            Nota tidak dihapus, hanya ditandai VOID. Lot dari nota ini dibatalkan dan kas dibalik.
            <br />
            Kalau barangnya sudah sebagian laku, void akan ditolak &mdash; gunakan penyesuaian stok.
          </>
        }
        onKonfirmasi={async (alasan) => {
          if (voidId) await batalkan.mutateAsync({ id: voidId, alasan });
        }}
      />
    </div>
  );
}
