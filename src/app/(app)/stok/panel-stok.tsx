/**
 * Stok — PRD pasal 5, 4.5, 10, dan 12.
 *
 * Kasir: hanya melihat qty dalam satuan jual. Nilai HPP tidak ditampilkan
 * (dan memang tidak dikirim server).
 * Owner: nilai lot, penyesuaian SUSUT/RUSAK/OPNAME, dan pengisian stok awal.
 */

"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackagePlus, SlidersHorizontal, Layers } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
} from "@/components/ui/dasar";
import { fetchJson, formatRupiah, formatTanggal } from "@/lib/utils";
import { formatQtyPanjang, SATUAN_LABEL, type SatuanDasar } from "@/lib/satuan";

interface BarisStok {
  productId: string;
  nama: string;
  merek: string;
  satuanDasar: SatuanDasar;
  qty: number;
  nilai: number | null;
  jumlahLot: number;
}

interface Lot {
  id: string;
  qtyAwal: number;
  qtySisa: number;
  hppSisa: number;
  purchasedAt: string;
  sumber: "PURCHASE" | "OPENING";
  ref: string | null;
}

type Tab = "daftar" | "sesuaikan" | "awal";

export function PanelStok({ isOwner }: { isOwner: boolean }) {
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<Tab>("daftar");
  const [lihatLot, setLihatLot] = React.useState<string | null>(null);

  const stokQ = useQuery({
    queryKey: ["laporan-stok"],
    queryFn: () => fetchJson<{ stok: BarisStok[] }>("/api/laporan/stok"),
  });

  const lotQ = useQuery({
    queryKey: ["lot", lihatLot],
    queryFn: () => fetchJson<{ lot: Lot[] }>(`/api/stok?product_id=${lihatLot}`),
    enabled: Boolean(lihatLot) && isOwner,
  });

  const stok = stokQ.data?.stok ?? [];
  const totalNilai = stok.reduce((a, s) => a + (s.nilai ?? 0), 0);

  const tabs: { key: Tab; label: string; ownerSaja?: boolean }[] = [
    { key: "daftar", label: "Daftar stok" },
    { key: "sesuaikan", label: "Susut / Rusak / Opname", ownerSaja: true },
    { key: "awal", label: "Stok awal", ownerSaja: true },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Stok</h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          Qty ditampilkan dalam satuan jual, bukan pecahan karung.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs
          .filter((t) => !t.ownerSaja || isOwner)
          .map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={
                tab === t.key
                  ? "min-h-11 whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white dark:bg-blue-500"
                  : "min-h-11 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-gray-50 dark:hover:bg-zinc-700"
              }
            >
              {t.label}
            </button>
          ))}
      </div>

      {tab === "daftar" && (
        <Card>
          <CardJudul
            judul="Stok per SKU"
            keterangan={
              isOwner
                ? `Nilai stok = jumlah sisa nilai semua lot. Total ${formatRupiah(totalNilai)}.`
                : "Merek berbeda dihitung sebagai barang berbeda."
            }
          />

          {stokQ.isLoading ? (
            <SkeletonTabel />
          ) : stokQ.isError ? (
            <Galat pesan={(stokQ.error as Error).message} onCoba={() => stokQ.refetch()} />
          ) : stok.length === 0 ? (
            <Kosong
              pesan="Belum ada barang"
              keterangan="Owner perlu mengisi master barang lebih dulu."
            />
          ) : (
            <Tabel>
              <thead>
                <tr>
                  <Th>Barang</Th>
                  <Th className="text-right">Sisa stok</Th>
                  {isOwner && <Th className="text-right">Nilai (HPP)</Th>}
                  {isOwner && <Th className="text-right">Lot</Th>}
                </tr>
              </thead>
              <tbody>
                {stok.map((s) => (
                  <tr key={s.productId}>
                    <Td>
                      <p className="font-medium">
                        {s.nama} {s.merek}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Satuan {SATUAN_LABEL[s.satuanDasar]}
                      </p>
                    </Td>
                    <Td className="text-right">
                      {s.qty <= 0 ? (
                        <Badge nada="bahaya">Habis</Badge>
                      ) : (
                        formatQtyPanjang(s.qty, s.satuanDasar)
                      )}
                    </Td>
                    {isOwner && (
                      <Td className="text-right tabular-nums">{formatRupiah(s.nilai ?? 0)}</Td>
                    )}
                    {isOwner && (
                      <Td className="text-right">
                        <button
                          onClick={() => setLihatLot(lihatLot === s.productId ? null : s.productId)}
                          className="inline-flex items-center gap-1 text-blue-700 hover:underline dark:text-blue-300"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          {s.jumlahLot}
                        </button>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Tabel>
          )}

          {isOwner && lihatLot && (
            <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-zinc-700">
              <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
                Antrian lot FIFO &mdash; yang paling atas dipotong lebih dulu
              </p>
              {lotQ.isLoading ? (
                <SkeletonTabel baris={3} />
              ) : (lotQ.data?.lot.length ?? 0) === 0 ? (
                <Kosong pesan="Tidak ada lot aktif" />
              ) : (
                <Tabel>
                  <thead>
                    <tr>
                      <Th>Masuk</Th>
                      <Th>Sumber</Th>
                      <Th className="text-right">Sisa</Th>
                      <Th className="text-right">Nilai sisa</Th>
                      <Th className="text-right">HPP / satuan</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotQ.data?.lot.map((l) => (
                      <tr key={l.id}>
                        <Td>{formatTanggal(l.purchasedAt)}</Td>
                        <Td>
                          {l.sumber === "OPENING" ? (
                            <Badge nada="peringatan">Stok awal (taksiran)</Badge>
                          ) : (
                            <span className="text-xs">{l.ref ?? "-"}</span>
                          )}
                        </Td>
                        <Td className="text-right tabular-nums">
                          {l.qtySisa} / {l.qtyAwal}
                        </Td>
                        <Td className="text-right tabular-nums">{formatRupiah(l.hppSisa)}</Td>
                        <Td className="text-right tabular-nums">
                          {l.qtySisa > 0
                            ? `Rp ${(l.hppSisa / l.qtySisa).toLocaleString("id-ID", {
                                maximumFractionDigits: 2,
                              })}`
                            : "-"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Tabel>
              )}
            </div>
          )}
        </Card>
      )}

      {tab === "sesuaikan" && isOwner && <FormPenyesuaian stok={stok} qc={qc} />}
      {tab === "awal" && isOwner && <FormStokAwal stok={stok} qc={qc} />}
    </div>
  );
}

// --------------------------------------------------------------------------

function FormPenyesuaian({
  stok,
  qc,
}: {
  stok: BarisStok[];
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [productId, setProductId] = React.useState<string | null>(null);
  const [alasan, setAlasan] = React.useState<string | null>("SUSUT");
  const [qty, setQty] = React.useState("");
  const [qtyFisik, setQtyFisik] = React.useState("");
  const [catatan, setCatatan] = React.useState("");
  const [taksiran, setTaksiran] = React.useState("");

  const produk = stok.find((s) => s.productId === productId);
  const isOpname = alasan === "OPNAME";
  const stokKosong = (produk?.qty ?? 0) === 0;

  const riwayatQ = useQuery({
    queryKey: ["penyesuaian"],
    queryFn: () =>
      fetchJson<{
        penyesuaian: {
          id: string;
          nomor: string;
          alasan: string;
          arah: string;
          qty: number;
          catatan: string;
          nilaiHpp: number;
          tanggal: string;
          product: { nama: string; merek: string; satuanDasar: SatuanDasar };
          createdBy: { nama: string };
        }[];
      }>("/api/penyesuaian"),
  });

  const simpan = useMutation({
    mutationFn: () =>
      fetchJson("/api/penyesuaian", {
        method: "POST",
        body: JSON.stringify({
          productId,
          alasan,
          arah: "KURANG",
          qty: isOpname ? undefined : qty,
          qtyFisik: isOpname ? qtyFisik : undefined,
          catatan,
          nilaiHppTaksiran: taksiran ? Number(taksiran) : undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Penyesuaian tersimpan dan tercatat di audit log");
      setQty("");
      setQtyFisik("");
      setCatatan("");
      setTaksiran("");
      qc.invalidateQueries({ queryKey: ["laporan-stok"] });
      qc.invalidateQueries({ queryKey: ["penyesuaian"] });
      riwayatQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const siap =
    productId && alasan && catatan.trim().length >= 4 && (isOpname ? qtyFisik !== "" : qty !== "");

  return (
    <div className="space-y-4">
      <Card>
        <CardJudul
          judul="Penyesuaian stok"
          keterangan="Susut, rusak, atau hasil opname. Wajib beralasan dan selalu masuk audit log."
        />

        <div className="space-y-3">
          <SearchableSelect
            label="Barang"
            required
            value={productId}
            onChange={setProductId}
            placeholder="Pilih barang"
            emptyText="Barang tidak ditemukan"
            options={stok.map((s) => ({
              value: s.productId,
              label: `${s.nama} ${s.merek}`,
              hint: `Stok sistem ${formatQtyPanjang(s.qty, s.satuanDasar)}`,
            }))}
          />

          <SearchableSelect
            label="Alasan"
            required
            value={alasan}
            onChange={setAlasan}
            placeholder="Pilih alasan"
            emptyText="Tidak ditemukan"
            options={[
              { value: "SUSUT", label: "Susut", hint: "Berkurang wajar saat ditakar/dipindah" },
              { value: "RUSAK", label: "Rusak", hint: "Barang tidak layak jual" },
              { value: "OPNAME", label: "Opname", hint: "Koreksi ke hasil hitung fisik" },
            ]}
          />

          {produk && !isOpname && (
            <Field
              label={`Qty berkurang (${SATUAN_LABEL[produk.satuanDasar]})`}
              wajib
              bantuan={`Stok sistem sekarang ${formatQtyPanjang(produk.qty, produk.satuanDasar)}. Pengurangan memotong lot tertua.`}
            >
              <Input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
          )}

          {produk && isOpname && (
            <>
              <Field
                label={`Qty fisik hasil hitung (${SATUAN_LABEL[produk.satuanDasar]})`}
                wajib
                bantuan={`Sistem mencatat ${formatQtyPanjang(produk.qty, produk.satuanDasar)}. Isi angka hasil hitungan nyata, boleh 0.`}
              >
                <Input
                  inputMode="numeric"
                  value={qtyFisik}
                  onChange={(e) => setQtyFisik(e.target.value)}
                />
              </Field>

              {qtyFisik !== "" && Number(qtyFisik) > produk.qty && stokKosong && (
                <Field
                  label="Taksiran HPP total untuk kelebihan"
                  wajib
                  bantuan="Stok sistem kosong, jadi tidak ada dasar harga. Isi taksiran owner."
                >
                  <Input
                    inputMode="numeric"
                    value={taksiran}
                    onChange={(e) => setTaksiran(e.target.value)}
                  />
                </Field>
              )}
            </>
          )}

          <Field
            label="Catatan"
            wajib
            bantuan="Minimal 4 karakter. Selisih tidak boleh diserap tanpa penjelasan."
          >
            <TextArea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: tumpah saat menakar ulang gula pasir"
            />
          </Field>

          <Peringatan>
            Penyesuaian tidak menyentuh kas dan tidak dihitung sebagai omzet. Nilainya masuk
            sebagai kerugian stok di Report.
          </Peringatan>

          <Tombol onClick={() => simpan.mutate()} memuat={simpan.isPending} disabled={!siap}>
            <SlidersHorizontal className="h-4 w-4" />
            Simpan penyesuaian
          </Tombol>
        </div>
      </Card>

      <Card>
        <CardJudul judul="Riwayat penyesuaian" />
        {riwayatQ.isLoading ? (
          <SkeletonTabel />
        ) : (riwayatQ.data?.penyesuaian.length ?? 0) === 0 ? (
          <Kosong pesan="Belum ada penyesuaian" />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Tanggal</Th>
                <Th>Nomor</Th>
                <Th>Barang</Th>
                <Th>Alasan</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Nilai</Th>
                <Th>Catatan</Th>
              </tr>
            </thead>
            <tbody>
              {riwayatQ.data?.penyesuaian.map((p) => (
                <tr key={p.id}>
                  <Td className="whitespace-nowrap">{formatTanggal(p.tanggal)}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs">{p.nomor}</Td>
                  <Td>
                    {p.product.nama} {p.product.merek}
                  </Td>
                  <Td>
                    <Badge nada={p.arah === "KURANG" ? "bahaya" : "sukses"}>
                      {p.alasan} {p.arah === "KURANG" ? "−" : "+"}
                    </Badge>
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatQtyPanjang(p.qty, p.product.satuanDasar)}
                  </Td>
                  <Td className="text-right tabular-nums">{formatRupiah(p.nilaiHpp)}</Td>
                  <Td className="max-w-xs text-xs">{p.catatan}</Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        )}
      </Card>
    </div>
  );
}

// --------------------------------------------------------------------------

function FormStokAwal({
  stok,
  qc,
}: {
  stok: BarisStok[];
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [productId, setProductId] = React.useState<string | null>(null);
  const [qty, setQty] = React.useState("");
  const [hpp, setHpp] = React.useState("");

  const produk = stok.find((s) => s.productId === productId);

  const simpan = useMutation({
    mutationFn: () =>
      fetchJson("/api/stok/awal", {
        method: "POST",
        body: JSON.stringify({ productId, qty, hppTotal: Number(hpp) }),
      }),
    onSuccess: () => {
      toast.success("Stok awal tersimpan sebagai lot OPENING");
      setQty("");
      setHpp("");
      setProductId(null);
      qc.invalidateQueries({ queryKey: ["laporan-stok"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardJudul
        judul="Stok awal go-live"
        keterangan="Dipakai sekali per barang saat sistem mulai dipakai."
      />

      <div className="space-y-3">
        <Peringatan judul="Yang wajib tepat adalah qty fisik, bukan HPP">
          HPP di sini adalah taksiran owner dan tidak perlu sempurna. Qty harus hasil hitung
          fisik hari go-live &mdash; kalau qty-nya salah, seluruh laporan stok ikut salah.
        </Peringatan>

        <SearchableSelect
          label="Barang"
          required
          value={productId}
          onChange={setProductId}
          placeholder="Pilih barang"
          emptyText="Barang tidak ditemukan"
          options={stok.map((s) => ({
            value: s.productId,
            label: `${s.nama} ${s.merek}`,
            hint: `Stok tercatat ${formatQtyPanjang(s.qty, s.satuanDasar)}`,
          }))}
        />

        {produk && (
          <>
            <Field
              label={`Qty fisik (${SATUAN_LABEL[produk.satuanDasar]})`}
              wajib
              bantuan={
                produk.satuanDasar === "GRAM"
                  ? "Gram bulat. 1 karung 50 kg ditulis 50000."
                  : `${SATUAN_LABEL[produk.satuanDasar]} bulat.`
              }
            >
              <Input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>

            <Field
              label="Taksiran HPP total seluruh qty di atas"
              wajib
              bantuan="Total rupiah, bukan per satuan. Contoh: 50 kg gula taksiran Rp 600.000."
            >
              <Input inputMode="numeric" value={hpp} onChange={(e) => setHpp(e.target.value)} />
            </Field>
          </>
        )}

        <Tombol
          onClick={() => simpan.mutate()}
          memuat={simpan.isPending}
          disabled={!productId || !qty || !hpp}
        >
          <PackagePlus className="h-4 w-4" />
          Simpan stok awal
        </Tombol>
      </div>
    </Card>
  );
}
