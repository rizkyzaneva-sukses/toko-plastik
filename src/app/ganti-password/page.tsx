"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, Lock } from "lucide-react";
import { Tombol, Input, Field, Card, Peringatan } from "@/components/ui/dasar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HalamanGantiPassword() {
  const router = useRouter();
  const [passwordLama, setPasswordLama] = React.useState("");
  const [passwordBaru, setPasswordBaru] = React.useState("");
  const [konfirmasi, setKonfirmasi] = React.useState("");
  const [memuat, setMemuat] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setMemuat(true);
    setError(null);

    if (passwordBaru !== konfirmasi) {
      setError("Konfirmasi password tidak cocok");
      setMemuat(false);
      return;
    }

    if (passwordBaru.length < 6) {
      setError("Password baru minimal 6 karakter");
      setMemuat(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/ganti-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordLama, passwordBaru }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal mengganti password");
        return;
      }

      toast.success("Password berhasil diganti!");
      router.push("/");
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server. Cek koneksi internet.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="flex min-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-500 p-2 text-white dark:bg-amber-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                Ganti Password
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Password seed wajib diganti sebelum melanjutkan
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card>
          <form onSubmit={kirim} className="space-y-4">
            <Peringatan nada="peringatan">
              Anda login dengan password seed. Untuk keamanan, silakan ganti
              password sekarang.
            </Peringatan>

            <Field label="Password lama" wajib>
              <Input
                type="password"
                value={passwordLama}
                onChange={(e) => setPasswordLama(e.target.value)}
                autoComplete="current-password"
                placeholder="Password seed saat ini"
                required
                autoFocus
              />
            </Field>

            <Field label="Password baru" wajib>
              <Input
                type="password"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                autoComplete="new-password"
                placeholder="Minimal 6 karakter"
                required
              />
            </Field>

            <Field label="Konfirmasi password baru" wajib>
              <Input
                type="password"
                value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)}
                autoComplete="new-password"
                placeholder="Ketik ulang password baru"
                required
              />
            </Field>

            {error && <Peringatan nada="bahaya">{error}</Peringatan>}

            <Tombol type="submit" memuat={memuat} className="w-full">
              <Lock className="h-4 w-4" />
              Simpan & Lanjutkan
            </Tombol>
          </form>
        </Card>
      </div>
    </div>
  );
}
