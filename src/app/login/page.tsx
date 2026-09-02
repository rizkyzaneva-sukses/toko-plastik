"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Store, LogIn } from "lucide-react";
import { Tombol, Input, Field, Card, Peringatan } from "@/components/ui/dasar";
import { ThemeToggle } from "@/components/theme-toggle";

function FormLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("return_to") || "/";

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [memuat, setMemuat] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setMemuat(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal login");
        return;
      }

      toast.success(`Selamat datang, ${data.nama}`);
      // Halaman tujuan menyesuaikan role di server, jadi cukup dorong ke returnTo.
      router.push(returnTo);
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server. Cek koneksi internet.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <form onSubmit={kirim} className="space-y-4">
      <Field label="Username" wajib>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          placeholder="owner atau kasir"
          required
          autoFocus
        />
      </Field>

      <Field label="Password" wajib>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Password"
          required
        />
      </Field>

      {error && <Peringatan nada="bahaya">{error}</Peringatan>}

      <Tombol type="submit" memuat={memuat} className="w-full">
        <LogIn className="h-4 w-4" />
        Masuk
      </Tombol>
    </form>
  );
}

export default function HalamanLogin() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-600 p-2 text-white dark:bg-blue-500">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                Toko Plastik &amp; Bahan Kue
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Stok FIFO &middot; Kas nyata &middot; V1
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card>
          <React.Suspense fallback={<div className="h-64" />}>
            <FormLogin />
          </React.Suspense>
        </Card>

        <p className="mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
          Password awal dari seed wajib diganti setelah login pertama.
        </p>
      </div>
    </div>
  );
}
