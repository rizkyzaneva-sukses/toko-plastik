/**
 * Pelunasan — PRD pasal 6.3.
 *
 * Alokasi selalu ke nota tertua dulu, dan pembagiannya ditampilkan sebelum
 * disimpan supaya tidak ada uang yang "mengendap" tanpa terlihat.
 */

"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HandCoins } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Card,
  CardJudul,
  Tombol,
  Input,
  TextArea,
  Field,
  Kosong,
  SkeletonTabel,
  Peringatan,
  Tabel,
  Th,
  Td,
  Badge,
} from "@/components/ui/dasar";
import { fetchJson, formatRupiah, formatTanggal, labelTempo, hariLewatTempo } from "@/lib/utils";

type Arah = "VENDOR" | "CUSTOMER";

interface Pihak {
  id: string;
  nama: string;
  isSystem: boolean;
}

interface NotaTerbuka {
  id: string;
  nomor: string;
  tanggal: string;
  total: number;
  sisaHutang?: number;
  sisaPiutang?: number;
  jatuhTempo: string | null;
}

function sisaNota(n: NotaTerbuka) {
  return n.sisaHutang ?? n.sisaPiutang ?? 0;
}

interface TagihanVendor {
  id: string;
  nomor: string;
  tanggal: string;
  jatuhTempo: string | null;
  sisaHutang: number;
  vendor: { nama: string };
}

interface TagihanCustomer {
  id: string;
  nomor: string;
  tanggal: string;
  jatuhTempo: string | null;
  sisaPiutang: number;
  customer: { nama: string };
}

/** Dua endpoint mengembalikan bentuk berbeda; keduanya dipakai satu komponen. */
interface DaftarTagihanData {
  hutang?: TagihanVendor[];
  piutang?: TagihanCustomer[];
}

export function PanelPelunasan({ isOwner }: { isOwner: boolean }) {
  const qc = useQueryClient();
  const [arah, setArah] = React.useState<Arah>(isOwner ? "VENDOR" : "CUSTOMER");
  const [partyId, setPartyId] = React.useState<string | null>(null);
  const [nominal, setNominal] = React.useState("");
  const [catatan, setCatatan] = React.useState("");

  const pihakQ = useQuery({
    queryKey: ["pihak", arah],
    queryFn: () => fetchJson<{ pihak: Pihak[] }>(`/api/pihak?tipe=${arah}`),
  });

  const notaQ = useQuery({
    queryKey: ["nota-terbuka", arah, partyId],
    queryFn: () =>
      fetchJson<{ nota: NotaTerbuka[] }>(
        `/api/pembayaran/nota-terbuka?arah=${arah}&party_id=${partyId}`
      ),
    enabled: Boolean(partyId),
  });

  const ringkasQ = useQuery<DaftarTagihanData>({
    queryKey: ["daftar-tagihan", arah],
    queryFn: () =>
      fetchJson<DaftarTagihanData>(
        arah === "VENDOR" ? "/api/laporan/hutang" : "/api/laporan/piutang"
      ),
    enabled: arah === "CUSTOMER" || isOwner,
  });

  const notas = notaQ.data?.nota ?? [];
  const totalTerbuka = notas.reduce((a, n) => a + sisaNota(n), 0);
  const nominalAngka = Number(nominal) || 0;

  // Pratinjau alokasi memakai aturan yang sama dengan server: tertua dulu.
  const alokasi: { nomor: string; nominal: number }[] = [];
  {
    let sisa = nominalAngka;
    for (const n of notas) {
      if (sisa <= 0) break;
      const pakai = Math.min(sisa, sisaNota(n));
      alokasi.push({ nomor: n.nomor, nominal: pakai });
      sisa -= pakai;
    }
  }

  const kelebihan = nominalAngka > totalTerbuka;

  const bayar = useMutation({
    mutationFn: () =>
      fetchJson<{ rincian: { nomor: string; nominal: number }[] }>("/api/pembayaran", {
        method: "POST",
        body: JSON.stringify({ arah, partyId, nominal: nominalAngka, catatan }),
      }),
    onSuccess: (d) => {
      toast.success(
        `Pembayaran tersimpan ke ${d.rincian.length} nota: ${d.rincian
          .map((r) => r.nomor)
          .join(", ")}`
      );
      setNominal("");
      setCatatan("");
      qc.invalidateQueries({ queryKey: ["nota-terbuka"] });
      qc.invalidateQueries({ queryKey: ["daftar-tagihan"] });
      qc.invalidateQueries({ queryKey: ["kas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pihakList = pihakQ.data?.pihak.filter((p) => !p.isSystem) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          Hutang &amp; Piutang
        </h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          Cicilan diterima. Pembayaran selalu masuk ke nota tertua lebih dulu.
        </p>
      </div>

      {isOwner && (
        <div className="flex gap-2">
          {(["VENDOR", "CUSTOMER"] as const).map((a) => (
            <button
              key={a}
              onClick={() => {
                setArah(a);
                setPartyId(null);
                setNominal("");
              }}
              aria-pressed={arah === a}
              className={
                arah === a
                  ? "min-h-11 flex-1 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white dark:bg-blue-500"
                  : "min-h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-gray-50 dark:hover:bg-zinc-700"
              }
            >
              {a === "VENDOR" ? "Bayar hutang vendor" : "Terima piutang customer"}
            </button>
          ))}
        </div>
      )}

      {!isOwner && (
        <Peringatan nada="info">
          Akun kasir hanya bisa menerima pelunasan piutang customer. Pembayaran hutang ke vendor
          adalah keputusan kas dan hanya bisa dicatat owner.
        </Peringatan>
      )}

      <Card>
        <CardJudul judul={arah === "VENDOR" ? "Bayar vendor" : "Terima dari customer"} />

        <div className="space-y-3">
          <SearchableSelect
            label={arah === "VENDOR" ? "Vendor" : "Customer"}
            required
            value={partyId}
            onChange={(v) => {
              setPartyId(v);
              setNominal("");
            }}
            placeholder="Pilih pihak"
            emptyText="Tidak ditemukan"
            options={pihakList.map((p) => ({ value: p.id, label: p.nama }))}
          />

          {partyId && (
            <>
              {notaQ.isLoading ? (
                <SkeletonTabel baris={3} />
              ) : notas.length === 0 ? (
                <Kosong
                  pesan={arah === "VENDOR" ? "Tidak ada hutang terbuka" : "Tidak ada piutang terbuka"}
                />
              ) : (
                <>
                  <Tabel>
                    <thead>
                      <tr>
                        <Th>Nota</Th>
                        <Th>Tanggal</Th>
                        <Th>Tempo</Th>
                        <Th className="text-right">Sisa</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {notas.map((n) => (
                        <tr key={n.id}>
                          <Td className="whitespace-nowrap font-mono text-xs">{n.nomor}</Td>
                          <Td className="whitespace-nowrap">{formatTanggal(n.tanggal)}</Td>
                          <Td>
                            <Badge
                              nada={(hariLewatTempo(n.jatuhTempo) ?? -1) > 0 ? "bahaya" : "netral"}
                            >
                              {labelTempo(n.jatuhTempo)}
                            </Badge>
                          </Td>
                          <Td className="text-right tabular-nums">{formatRupiah(sisaNota(n))}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Tabel>

                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Total terbuka:{" "}
                    <span className="font-semibold">{formatRupiah(totalTerbuka)}</span>
                  </p>

                  <Field
                    label="Nominal dibayar"
                    wajib
                    bantuan="Cicilan boleh. Kelebihan bayar ditolak, bukan disimpan sebagai saldo."
                  >
                    <Input
                      inputMode="numeric"
                      value={nominal}
                      onChange={(e) => setNominal(e.target.value)}
                      placeholder="0"
                    />
                  </Field>

                  {kelebihan && (
                    <Peringatan nada="bahaya" judul="Nominal melebihi total tagihan">
                      Maksimal {formatRupiah(totalTerbuka)}. Kurangi nominalnya.
                    </Peringatan>
                  )}

                  {nominalAngka > 0 && !kelebihan && (
                    <div className="rounded-lg border border-gray-200 p-3 dark:border-zinc-700">
                      <p className="mb-1.5 text-sm font-semibold text-gray-900 dark:text-gray-50">
                        Uang ini akan dipecah ke:
                      </p>
                      <ul className="space-y-0.5 text-sm text-gray-700 dark:text-gray-300">
                        {alokasi.map((a) => (
                          <li key={a.nomor} className="flex justify-between gap-4">
                            <span className="font-mono text-xs">{a.nomor}</span>
                            <span className="tabular-nums">{formatRupiah(a.nominal)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Field label="Catatan">
                    <TextArea
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Opsional"
                    />
                  </Field>

                  <Tombol
                    onClick={() => bayar.mutate()}
                    memuat={bayar.isPending}
                    disabled={nominalAngka <= 0 || kelebihan}
                  >
                    <HandCoins className="h-4 w-4" />
                    {arah === "VENDOR" ? "Bayar sekarang" : "Terima uang"}
                  </Tombol>
                </>
              )}
            </>
          )}
        </div>
      </Card>

      {(arah === "CUSTOMER" || isOwner) && (
        <Card>
          <CardJudul
            judul={arah === "VENDOR" ? "Semua hutang terbuka" : "Semua piutang terbuka"}
            keterangan="Diurutkan dari yang paling dekat jatuh tempo."
          />
          {ringkasQ.isLoading ? (
            <SkeletonTabel />
          ) : (
            <DaftarTagihan data={ringkasQ.data} arah={arah} />
          )}
        </Card>
      )}
    </div>
  );
}

function DaftarTagihan({
  data,
  arah,
}: {
  data: DaftarTagihanData | undefined;
  arah: Arah;
}) {
  const baris =
    arah === "VENDOR"
      ? (data?.hutang ?? []).map((h) => ({
          id: h.id,
          nomor: h.nomor,
          pihak: h.vendor.nama,
          tanggal: h.tanggal,
          jatuhTempo: h.jatuhTempo,
          sisa: h.sisaHutang,
        }))
      : (data?.piutang ?? []).map((p) => ({
          id: p.id,
          nomor: p.nomor,
          pihak: p.customer.nama,
          tanggal: p.tanggal,
          jatuhTempo: p.jatuhTempo,
          sisa: p.sisaPiutang,
        }));

  if (baris.length === 0) {
    return <Kosong pesan={arah === "VENDOR" ? "Tidak ada hutang" : "Tidak ada piutang"} />;
  }

  const total = baris.reduce((a, b) => a + b.sisa, 0);

  return (
    <>
      <Tabel>
        <thead>
          <tr>
            <Th>Nota</Th>
            <Th>{arah === "VENDOR" ? "Vendor" : "Customer"}</Th>
            <Th>Tanggal</Th>
            <Th>Umur</Th>
            <Th className="text-right">Sisa</Th>
          </tr>
        </thead>
        <tbody>
          {baris.map((b) => (
            <tr key={b.id}>
              <Td className="whitespace-nowrap font-mono text-xs">{b.nomor}</Td>
              <Td>{b.pihak}</Td>
              <Td className="whitespace-nowrap">{formatTanggal(b.tanggal)}</Td>
              <Td>
                <Badge nada={(hariLewatTempo(b.jatuhTempo) ?? -1) > 0 ? "bahaya" : "netral"}>
                  {labelTempo(b.jatuhTempo)}
                </Badge>
              </Td>
              <Td className="text-right tabular-nums">{formatRupiah(b.sisa)}</Td>
            </tr>
          ))}
        </tbody>
      </Tabel>
      <p className="mt-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-50">
        Total {formatRupiah(total)}
      </p>
    </>
  );
}
