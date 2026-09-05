/**
 * Rangka aplikasi: sidebar (drawer di HP) + topbar + bottom nav HP.
 *
 * PRD pasal 8:
 *  - Kasir: satu layar jual. "Jangan menu akuntansi."
 *  - Owner: tab Beli, Stok, Hutang/Piutang, Kas, Pinjaman, Laporan, Log.
 * Menu disusun dari role yang dibaca server, bukan dari cookie.
 *
 * Menu dikelompokkan supaya deretan panjang tidak melelahkan mata. Di HP,
 * menu tersering ditaruh di bottom nav — dalam jangkauan jempol, satu tap,
 * tanpa harus membuka drawer dulu.
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

interface GrupMenu {
  /** null = tanpa judul, dipakai untuk item tunggal di paling atas. */
  judul: string | null;
  items: ItemMenu[];
}

const MENU: GrupMenu[] = [
  {
    judul: null,
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard, ownerSaja: true }],
  },
  {
    judul: "Penjualan",
    items: [
      { href: "/kasir", label: "Jual", icon: ShoppingCart, keterangan: "Layar kasir" },
      { href: "/nota-jual", label: "Nota Jual", icon: Receipt },
    ],
  },
  {
    judul: "Keuangan",
    items: [
      { href: "/kas", label: "Kas", icon: Wallet, ownerSaja: true },
      { href: "/hutang-piutang", label: "Hutang / Piutang", icon: HandCoins },
      { href: "/pinjaman", label: "Pinjaman Owner", icon: PiggyBank, ownerSaja: true },
      { href: "/laporan", label: "Report", icon: BarChart3, ownerSaja: true },
    ],
  },
  {
    judul: "Operasional",
    items: [
      { href: "/stok", label: "Stok", icon: PackageSearch },
      { href: "/beli", label: "Beli", icon: Store, ownerSaja: true },
      { href: "/master", label: "Master", icon: Settings, ownerSaja: true },
    ],
  },
  {
    judul: "Lainnya",
    items: [
      // Panduan terbuka untuk kasir juga: isinya bantuan, bukan menu akuntansi.
      { href: "/panduan", label: "Panduan", icon: BookOpen },
      { href: "/log", label: "Audit Log", icon: ScrollText, ownerSaja: true },
    ],
  },
];

const SEMUA_ITEM = MENU.flatMap((g) => g.items);

// Menu bottom nav HP: yang paling sering dibuka sehari-hari, per role.
// Slot kelima selalu tombol "Menu" untuk membuka drawer berisi semua menu.
const BOTTOM_NAV: Record<UserRingkas["role"], string[]> = {
  OWNER: ["/", "/kasir", "/kas", "/stok"],
  KASIR: ["/kasir", "/nota-jual", "/stok", "/hutang-piutang"],
};

function cocokRute(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ user, children }: { user: UserRingkas; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [bukaDrawer, setBukaDrawer] = React.useState(false);

  const boleh = React.useCallback(
    (m: ItemMenu) => !m.ownerSaja || user.role === "OWNER",
    [user.role]
  );

  // Grup yang seluruh isinya menu owner ikut hilang untuk kasir.
  const grup = MENU.map((g) => ({ ...g, items: g.items.filter(boleh) })).filter(
    (g) => g.items.length > 0
  );

  const itemBottom = BOTTOM_NAV[user.role]
    .map((href) => SEMUA_ITEM.find((m) => m.href === href))
    .filter((m): m is ItemMenu => Boolean(m) && boleh(m!));

  React.useEffect(() => {
    setBukaDrawer(false);
  }, [pathname]);

  async function keluar() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Sudah keluar");
    router.push("/login");
    router.refresh();
  }

  const judulHalaman = React.useMemo(() => {
    const cocok = SEMUA_ITEM.slice()
      .sort((a, b) => b.href.length - a.href.length)
      .find((m) => cocokRute(m.href, pathname));
    return cocok?.label ?? "";
  }, [pathname]);

  const daftarMenu = (
    <nav className="flex flex-col gap-0.5 p-2">
      {grup.map((g, i) => (
        <div key={g.judul ?? "utama"} className={cn(i > 0 && "mt-3")}>
          {g.judul && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
              {g.judul}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {g.items.map((m) => {
              const aktif = cocokRute(m.href, pathname);
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
          </div>
        </div>
      ))}
    </nav>
  );

  const kepalaSidebar = (
    <div className="flex items-center gap-2">
      <div className="rounded-md bg-blue-600 p-1.5 text-white dark:bg-blue-500">
        <Store className="h-4 w-4" />
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">Toko Plastik</span>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar — mulai tablet (md), bukan lg, supaya iPad potrait tidak
          terpaksa memakai drawer padahal layarnya muat. */}
      <aside className="hidden shrink-0 border-r border-gray-200 bg-white md:block md:w-56 lg:w-60 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4 dark:border-zinc-700">
          {kepalaSidebar}
        </div>
        {daftarMenu}
      </aside>

      {/* Drawer HP — selalu dirender, ditampilkan dengan translate agar animasi slide berjalan */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          bukaDrawer ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!bukaDrawer}
      >
        <button
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity duration-300",
            bukaDrawer ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setBukaDrawer(false)}
          aria-label="Tutup menu"
          tabIndex={bukaDrawer ? 0 : -1}
        />
        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-64 overflow-y-auto border-r border-gray-200 bg-white",
            "transition-transform duration-300 ease-in-out",
            "dark:border-zinc-700 dark:bg-zinc-900",
            bukaDrawer ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-zinc-700">
            {kepalaSidebar}
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
          <div className="min-w-0 flex-1">
            {/* HP: judul halaman aktif. Tombol menu ada di bottom nav, jadi
                topbar tidak perlu hamburger lagi. */}
            {judulHalaman && (
              <p className="truncate text-sm font-semibold text-gray-900 md:hidden dark:text-gray-50">
                {judulHalaman}
              </p>
            )}
            <p className="hidden truncate text-sm font-medium text-gray-900 md:block dark:text-gray-50">
              {user.nama}
            </p>
            <p className="hidden text-xs text-gray-600 md:block dark:text-gray-400">
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
          {/* pb besar di HP supaya baris terakhir tidak tertutup bottom nav */}
          <div className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 md:pb-5">{children}</div>
        </main>
      </div>

      {/* Bottom nav HP */}
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white md:hidden",
          "pb-[env(safe-area-inset-bottom)] dark:border-zinc-700 dark:bg-zinc-900"
        )}
        aria-label="Menu utama"
      >
        <div className="flex">
          {itemBottom.map((m) => {
            const aktif = cocokRute(m.href, pathname);
            return (
              <Link
                key={m.href}
                href={m.href}
                aria-current={aktif ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 py-2",
                  "text-[11px] font-medium transition-colors",
                  aktif
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                )}
              >
                <m.icon className="h-5 w-5 shrink-0" />
                <span className="w-full truncate text-center">{m.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setBukaDrawer(true)}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 py-2",
              "text-[11px] font-medium text-gray-600 transition-colors",
              "hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            )}
            aria-label="Buka semua menu"
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
