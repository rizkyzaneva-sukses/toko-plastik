/**
 * Master barang, vendor/customer, dan user — owner saja (PRD pasal 5).
 *
 * PRD pasal 13: konversi hanya owner, dan mengubahnya TIDAK menghitung ulang
 * barang lama. Peringatan itu ditampilkan di form.
 */

"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Power, UserPlus } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DialogKonfirmasi } from "@/components/ui/dialog-konfirmasi";
import {
  Card,
  CardJudul,
  Tombol,
  Input,
  Field,
  Kosong,
  SkeletonTabel,
  Peringatan,
  Tabel,
  Th,
  Td,
  Badge,
} from "@/components/ui/dasar";
import { fetchJson, formatRupiah, formatAngka, formatTanggalJam } from "@/lib/utils";
import { SATUAN_LABEL, SATUAN_OPSI, formatQtyPanjang, type SatuanDasar } from "@/lib/satuan";

interface Produk {
  id: string;
  nama: string;
  merek: string;
  kategori: string | null;
  satuanDasar: SatuanDasar;
  namaSatuanBeli: string;
  konversiBeli: number;
  hargaJualDefault: number;
  hargaJualPerQty: number;
  aktif: boolean;
  stokQty: number;
}

interface Pihak {
  id: string;
  tipe: "VENDOR" | "CUSTOMER";
  nama: string;
  telepon: string | null;
  isSystem: boolean;
  aktif: boolean;
}

interface Pengguna {
  id: string;
  nama: string;
  username: string;
  role: "OWNER" | "KASIR";
  isActive: boolean;
  lastLoginAt: string | null;
}

type Tab = "barang" | "pihak" | "pengguna";

export function PanelMaster() {
  const [tab, setTab] = React.useState<Tab>("barang");

  const tabs: { key: Tab; label: string }[] = [
    { key: "barang", label: "Barang" },
    { key: "pihak", label: "Vendor & Customer" },
    { key: "pengguna", label: "Pengguna" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">Master</h1>
        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
          Semua perubahan di sini tercatat di audit log.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
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

      {tab === "barang" && <TabBarang />}
      {tab === "pihak" && <TabPihak />}
      {tab === "pengguna" && <TabPengguna />}
    </div>
  );
}

// --------------------------------------------------------------------------

const KOSONG = {
  nama: "",
  merek: "",
  kategori: "",
  satuanDasar: "GRAM" as SatuanDasar,
  namaSatuanBeli: "karung",
  konversiBeli: "",
  hargaJualDefault: "",
  hargaJualPerQty: "1000",
};

function TabBarang() {
  const qc = useQueryClient();
  const [form, setForm] = React.useState({ ...KOSONG });
  const [editId, setEditId] = React.useState<string | null>(null);
  const [nonaktifId, setNonaktifId] = React.useState<string | null>(null);

  const produkQ = useQuery({
    queryKey: ["produk", "semua"],
    queryFn: () => fetchJson<{ produk: Produk[] }>("/api/produk?semua=1"),
  });

  function set<K extends keyof typeof KOSONG>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function pilihSatuan(v: string | null) {
    const s = (v ?? "GRAM") as SatuanDasar;
    setForm((f) => ({
      ...f,
      satuanDasar: s,
      // IKET dan PCS tidak mengenal konversi gram (PRD A13).
      konversiBeli: s === "GRAM" ? f.konversiBeli : "1",
      hargaJualPerQty: s === "GRAM" ? "1000" : "1",
      namaSatuanBeli: s === "GRAM" ? f.namaSatuanBeli : s === "IKET" ? "iket" : "pcs",
    }));
  }

  const badan = () => ({
    nama: form.nama,
    merek: form.merek,
    kategori: form.kategori,
    satuanDasar: form.satuanDasar,
    namaSatuanBeli: form.namaSatuanBeli,
    konversiBeli: Number(form.konversiBeli),
    hargaJualDefault: Number(form.hargaJualDefault),
    hargaJualPerQty: Number(form.hargaJualPerQty),
  });

  const simpan = useMutation({
    mutationFn: () =>
      editId
        ? fetchJson(`/api/produk/${editId}`, { method: "PUT", body: JSON.stringify(badan()) })
        : fetchJson("/api/produk", { method: "POST", body: JSON.stringify(badan()) }),
    onSuccess: () => {
      toast.success(editId ? "Barang diperbarui" : "Barang ditambahkan");
      setForm({ ...KOSONG });
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["produk"] });
      qc.invalidateQueries({ queryKey: ["laporan-stok"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/produk/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Status barang diubah");
      setNonaktifId(null);
      qc.invalidateQueries({ queryKey: ["produk"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setNonaktifId(null);
    },
  });

  function mulaiEdit(p: Produk) {
    setEditId(p.id);
    setForm({
      nama: p.nama,
      merek: p.merek,
      kategori: p.kategori ?? "",
      satuanDasar: p.satuanDasar,
      namaSatuanBeli: p.namaSatuanBeli,
      konversiBeli: String(p.konversiBeli),
      hargaJualDefault: String(p.hargaJualDefault),
      hargaJualPerQty: String(p.hargaJualPerQty),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const produkAsli = produkQ.data?.produk.find((p) => p.id === editId);
  const konversiBerubah =
    editId && produkAsli && Number(form.konversiBeli) !== produkAsli.konversiBeli;

  const siap =
    form.nama.trim() &&
    form.merek.trim() &&
    form.namaSatuanBeli.trim() &&
    Number(form.konversiBeli) > 0 &&
    form.hargaJualDefault !== "";

  return (
    <div className="space-y-4">
      <Card>
        <CardJudul
          judul={editId ? "Ubah barang" : "Tambah barang"}
          aksi={
            editId && (
              <Tombol
                varian="sekunder"
                onClick={() => {
                  setEditId(null);
                  setForm({ ...KOSONG });
                }}
              >
                Batal edit
              </Tombol>
            )
          }
        />

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama barang" wajib>
              <Input
                value={form.nama}
                onChange={(e) => set("nama", e.target.value)}
                placeholder="Gula Pasir"
              />
            </Field>
            <Field label="Merek" wajib bantuan="Merek berbeda dihitung sebagai SKU berbeda.">
              <Input
                value={form.merek}
                onChange={(e) => set("merek", e.target.value)}
                placeholder="Gulaku"
              />
            </Field>
          </div>

          <SearchableSelect
            label="Satuan dasar"
            required
            value={form.satuanDasar}
            onChange={pilihSatuan}
            placeholder="Pilih satuan"
            emptyText="Tidak ditemukan"
            options={SATUAN_OPSI}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Nama satuan beli"
              wajib
              bantuan="Apa yang tertulis di nota vendor: karung, dus, iket, pcs."
            >
              <Input
                value={form.namaSatuanBeli}
                onChange={(e) => set("namaSatuanBeli", e.target.value)}
                disabled={form.satuanDasar !== "GRAM"}
              />
            </Field>

            <Field
              label={`1 ${form.namaSatuanBeli || "satuan beli"} = berapa ${SATUAN_LABEL[form.satuanDasar]}`}
              wajib
              bantuan={
                form.satuanDasar === "GRAM"
                  ? "Contoh: 1 karung gula 50 kg ditulis 50000."
                  : "Untuk iket dan pcs nilainya selalu 1."
              }
            >
              <Input
                inputMode="numeric"
                value={form.konversiBeli}
                onChange={(e) => set("konversiBeli", e.target.value)}
                disabled={form.satuanDasar !== "GRAM"}
                placeholder="50000"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Harga jual default (Rp)" wajib>
              <Input
                inputMode="numeric"
                value={form.hargaJualDefault}
                onChange={(e) => set("hargaJualDefault", e.target.value)}
                placeholder="13500"
              />
            </Field>
            <Field
              label={`Harga itu untuk berapa ${SATUAN_LABEL[form.satuanDasar]}`}
              wajib
              bantuan={
                form.satuanDasar === "GRAM"
                  ? "Isi 1000 kalau harganya per kg. Rp 13,5 per gram tidak perlu ditulis."
                  : "Selalu 1 untuk iket dan pcs."
              }
            >
              <Input
                inputMode="numeric"
                value={form.hargaJualPerQty}
                onChange={(e) => set("hargaJualPerQty", e.target.value)}
                disabled={form.satuanDasar !== "GRAM"}
              />
            </Field>
          </div>

          <Field label="Kategori" bantuan="Opsional. Contoh: Bahan Kue, Plastik.">
            <Input value={form.kategori} onChange={(e) => set("kategori", e.target.value)} />
          </Field>

          {konversiBerubah && (
            <Peringatan nada="bahaya" judul="Konversi diubah">
              Stok dan lot yang sudah ada TIDAK dihitung ulang. Konversi baru hanya berlaku untuk
              pembelian berikutnya. Perubahan ini masuk audit log.
            </Peringatan>
          )}

          <Tombol onClick={() => simpan.mutate()} memuat={simpan.isPending} disabled={!siap}>
            <Plus className="h-4 w-4" />
            {editId ? "Simpan perubahan" : "Tambah barang"}
          </Tombol>
        </div>
      </Card>

      <Card>
        <CardJudul judul="Daftar barang" />
        {produkQ.isLoading ? (
          <SkeletonTabel />
        ) : (produkQ.data?.produk.length ?? 0) === 0 ? (
          <Kosong pesan="Belum ada barang" keterangan="Tambahkan barang pertama di form atas." />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Barang</Th>
                <Th>Konversi</Th>
                <Th className="text-right">Harga jual</Th>
                <Th className="text-right">Stok</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {produkQ.data?.produk.map((p) => (
                <tr key={p.id}>
                  <Td>
                    <p className="font-medium">
                      {p.nama} {p.merek}
                    </p>
                    {p.kategori && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">{p.kategori}</p>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-xs">
                    1 {p.namaSatuanBeli} = {formatAngka(p.konversiBeli)}{" "}
                    {SATUAN_LABEL[p.satuanDasar]}
                  </Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">
                    {formatRupiah(p.hargaJualDefault)}
                    <span className="block text-xs text-gray-600 dark:text-gray-400">
                      / {p.hargaJualPerQty === 1 ? "" : formatAngka(p.hargaJualPerQty) + " "}
                      {SATUAN_LABEL[p.satuanDasar]}
                    </span>
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatQtyPanjang(p.stokQty, p.satuanDasar)}
                  </Td>
                  <Td>
                    {p.aktif ? (
                      <Badge nada="sukses">Aktif</Badge>
                    ) : (
                      <Badge nada="netral">Nonaktif</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => mulaiEdit(p)}
                        className="rounded p-1.5 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30"
                        aria-label="Ubah"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setNonaktifId(p.id)}
                        className="rounded p-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-700"
                        aria-label="Aktif/nonaktif"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        )}
      </Card>

      <DialogKonfirmasi
        buka={Boolean(nonaktifId)}
        onTutup={() => setNonaktifId(null)}
        judul="Ubah status barang"
        labelKonfirmasi="Ubah status"
        keterangan="Barang tidak pernah dihapus, hanya dinonaktifkan. Barang bersisa stok tidak bisa dinonaktifkan."
        onKonfirmasi={async () => {
          if (nonaktifId) await toggle.mutateAsync(nonaktifId);
        }}
      />
    </div>
  );
}

// --------------------------------------------------------------------------

function TabPihak() {
  const qc = useQueryClient();
  const [tipe, setTipe] = React.useState<string | null>("VENDOR");
  const [nama, setNama] = React.useState("");
  const [telepon, setTelepon] = React.useState("");

  const pihakQ = useQuery({
    queryKey: ["pihak", "semua"],
    queryFn: () => fetchJson<{ pihak: Pihak[] }>("/api/pihak?semua=1"),
  });

  const simpan = useMutation({
    mutationFn: () =>
      fetchJson("/api/pihak", { method: "POST", body: JSON.stringify({ tipe, nama, telepon }) }),
    onSuccess: () => {
      toast.success("Tersimpan");
      setNama("");
      setTelepon("");
      qc.invalidateQueries({ queryKey: ["pihak"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardJudul judul="Tambah vendor / customer" />
        <div className="space-y-3">
          <SearchableSelect
            label="Tipe"
            required
            value={tipe}
            onChange={setTipe}
            placeholder="Pilih tipe"
            emptyText="Tidak ditemukan"
            options={[
              { value: "VENDOR", label: "Vendor", hint: "Tempat toko membeli barang" },
              { value: "CUSTOMER", label: "Customer", hint: "Pembeli; wajib untuk penjualan kredit" },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama" wajib>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} />
            </Field>
            <Field label="Telepon">
              <Input
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                inputMode="tel"
              />
            </Field>
          </div>
          <Tombol
            onClick={() => simpan.mutate()}
            memuat={simpan.isPending}
            disabled={!nama.trim() || !tipe}
          >
            <Plus className="h-4 w-4" />
            Tambah
          </Tombol>
        </div>
      </Card>

      <Card>
        <CardJudul judul="Daftar" />
        {pihakQ.isLoading ? (
          <SkeletonTabel />
        ) : (pihakQ.data?.pihak.length ?? 0) === 0 ? (
          <Kosong pesan="Belum ada data" />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Tipe</Th>
                <Th>Telepon</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pihakQ.data?.pihak.map((p) => (
                <tr key={p.id}>
                  <Td>
                    {p.nama}
                    {p.isSystem && (
                      <Badge nada="info" className="ml-2">
                        Sistem
                      </Badge>
                    )}
                  </Td>
                  <Td>{p.tipe === "VENDOR" ? "Vendor" : "Customer"}</Td>
                  <Td>{p.telepon ?? "-"}</Td>
                  <Td>
                    {p.aktif ? <Badge nada="sukses">Aktif</Badge> : <Badge>Nonaktif</Badge>}
                  </Td>
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

function TabPengguna() {
  const qc = useQueryClient();
  const [nama, setNama] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<string | null>("KASIR");

  const penggunaQ = useQuery({
    queryKey: ["pengguna"],
    queryFn: () => fetchJson<{ pengguna: Pengguna[] }>("/api/pengguna"),
  });

  const simpan = useMutation({
    mutationFn: () =>
      fetchJson("/api/pengguna", {
        method: "POST",
        body: JSON.stringify({ nama, username, password, role }),
      }),
    onSuccess: () => {
      toast.success("Pengguna dibuat");
      setNama("");
      setUsername("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["pengguna"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardJudul judul="Tambah pengguna" />
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama" wajib>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} />
            </Field>
            <Field label="Username" wajib bantuan="3-20 karakter, huruf kecil/angka/underscore.">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Password" wajib bantuan="Minimal 6 karakter.">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <SearchableSelect
              label="Role"
              required
              value={role}
              onChange={setRole}
              placeholder="Pilih role"
              emptyText="Tidak ditemukan"
              options={[
                { value: "KASIR", label: "Kasir", hint: "Jual, lihat stok, terima pelunasan" },
                { value: "OWNER", label: "Owner", hint: "Semua menu termasuk void dan audit log" },
              ]}
            />
          </div>
          <Tombol
            onClick={() => simpan.mutate()}
            memuat={simpan.isPending}
            disabled={!nama.trim() || !username.trim() || password.length < 6}
          >
            <UserPlus className="h-4 w-4" />
            Tambah pengguna
          </Tombol>
        </div>
      </Card>

      <Card>
        <CardJudul judul="Daftar pengguna" />
        {penggunaQ.isLoading ? (
          <SkeletonTabel />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Username</Th>
                <Th>Role</Th>
                <Th>Login terakhir</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {penggunaQ.data?.pengguna.map((u) => (
                <tr key={u.id}>
                  <Td>{u.nama}</Td>
                  <Td className="font-mono text-xs">{u.username}</Td>
                  <Td>
                    <Badge nada={u.role === "OWNER" ? "info" : "netral"}>{u.role}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-xs">
                    {u.lastLoginAt ? formatTanggalJam(u.lastLoginAt) : "Belum pernah"}
                  </Td>
                  <Td>
                    {u.isActive ? <Badge nada="sukses">Aktif</Badge> : <Badge>Nonaktif</Badge>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        )}
      </Card>
    </div>
  );
}
