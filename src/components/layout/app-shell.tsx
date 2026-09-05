/**
 * Rangka aplikasi: sidebar (drawer di HP) + topbar.
 *
 * PRD pasal 8:
 *  - Kasir: satu layar jual. "Jangan menu akuntansi."
 *  - Owner: tab Beli, Stok, Hutang/Piutang, Kas, Pinjaman, Laporan, Log.
 * Menu disusun dari role yang dibaca server, bukan dari cookie.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  Receipt,
  PackageSearch,
  Wallet,
  HandCoins,
  PiggyBank,
  BarChart3,
  ScrollText,
  Settings,
  BookOpen,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export interface UserRingkas {
  id: string;
  nama: string;
  username: string;
  role: "OWNER" | "KASIR";
}

interface ItemMenu {
  href: string;
  label: string;
  icon: typeof Store;
  ownerSaja?: boolean;
  keterangan?: string;
}

const MENU: ItemMenu[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, ownerSaja: true },
  { href: "/kasir", label: "Jual", icon: ShoppingCart, keterangan: "Layar kasir" },
  { href: "/nota-jual", label: "Nota Jual", icon: Receipt },
  { href: "/stok", label: "Stok", icon: PackageSearch },
  { href: "/beli", label: "Beli", icon: Store, ownerSaja: true },
  { href: "/hutang-piutang", label: "Hutang / Piutang", icon: HandCoins },
  { href: "/kas", label: "Kas", icon: Wallet, ownerSaja: true },
  { href: "/pinjaman", label: "Pinjaman Owner", icon: PiggyBank, ownerSaja: true },
  { href: "/laporan", label: "Report", icon: BarChart3, ownerSaja: true },
  { href: "/master", label: "Master", icon: Settings, ownerSaja: true },
  { href: "/log", label: "Audit Log", icon: ScrollText, ownerSaja: true },
  // Panduan terbuka untuk kasir juga: isinya bantuan, bukan menu akuntansi.
  // Bagian owner tetap ditampilkan tapi ditandai, supaya kasir tahu harus
  // meminta apa ke owner tanpa mendapat akses ke menunya.
  { href: "/panduan", label: "Panduan", icon: BookOpen },
];

export function AppShell({ user, children }: { user: UserRingkas; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [bukaDrawer, setBukaDrawer] = React.useState(false);

  const menu = MENU.filter((m) => !m.ownerSaja || user.role === "OWNER");

  React.useEffect(() => {
    setBukaDrawer(false);
  }, [pathname]);

  async function keluar() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Sudah keluar");
    router.push("/login");
    router.refresh();
  }

  // Cari judul halaman aktif dari MENU untuk ditampilkan di topbar mobile
  const judulHalaman = React.useMemo(() => {
    const cocok = MENU.slice()
      .sort((a, b) => b.href.length - a.href.length)
      .find((m) => (m.href === "/" ? pathname === "/" : pathname === m.href || pathname.startsWith(m.href + "/")));
    return cocok?.label ?? "";
  }, [pathname]);

  const daftarMenu = (
    <nav className="flex flex-col gap-0.5 p-2">
      {menu.map((m) => {
        const aktif = m.href === "/" ? pathname === "/" : pathname === m.href || pathname.startsWith(m.href + "/");
        return (
          <Link
            key={m.href}
            href={m.href}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              aktif
                ? "bg-blue-600 text-white dark:bg-blue-500"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-700"
            )}
          >
            <m.icon className="h-4.5 w-4.5 shrink-0" />
            <span className="truncate">{m.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white lg:block dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4 dark:border-zinc-700">
          <div className="rounded-md bg-blue-600 p-1.5 text-white dark:bg-blue-500">
            <Store className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Toko Plastik
          </span>
        </div>
        {daftarMenu}
      </aside>

      {/* Drawer HP — selalu dirender, ditampilkan dengan translate agar animasi slide berjalan */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          bukaDrawer ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!bukaDrawer}
      >
        {/* Overlay backdrop */}
        <button
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity duration-300",
            bukaDrawer ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setBukaDrawer(false)}
          aria-label="Tutup menu"
          tabIndex={bukaDrawer ? 0 : -1}
        />
        {/* Drawer panel */}
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-64 border-r border-gray-200 bg-white",
            "transition-transform duration-300 ease-in-out",
            "dark:border-zinc-700 dark:bg-zinc-900",
            bukaDrawer ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-blue-600 p-1.5 text-white dark:bg-blue-500">
                <Store className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">Toko Plastik</span>
            </div>
            <button
              onClick={() => setBukaDrawer(false)}
              className="rounded p-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-700"
              aria-label="Tutup menu"
              tabIndex={bukaDrawer ? 0 : -1}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {daftarMenu}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-gray-200 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900">
          {/* Tombol hamburger — mobile only */}
          <button
            onClick={() => setBukaDrawer(true)}
            className="shrink-0 rounded-lg p-2 text-gray-700 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-zinc-700"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile: judul halaman aktif di tengah. Desktop: nama user */}
          <div className="min-w-0 flex-1">
            {/* Judul halaman — tampil di mobile, sembunyikan di desktop */}
            {judulHalaman && (
              <p className="truncate text-sm font-semibold text-gray-900 lg:hidden dark:text-gray-50">
                {judulHalaman}
              </p>
            )}
            {/* Nama & role — tampil di desktop, sembunyikan di mobile */}
            <p className="hidden truncate text-sm font-medium text-gray-900 lg:block dark:text-gray-50">
              {user.nama}
            </p>
            <p className="hidden text-xs text-gray-600 lg:block dark:text-gray-400">
              {user.role === "OWNER" ? "Owner" : "Kasir"}
            </p>
          </div>

          <ThemeToggle />

          <button
            onClick={keluar}
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-700"
            aria-label="Keluar"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Keluar</span>
          </button>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
