/**
 * Guard halaman server. Middleware hanya memastikan ada cookie; role tetap
 * diperiksa di sini dengan data segar dari database.
 *
 * PRD A10: kasir yang mencoba masuk halaman owner harus melihat penolakan yang
 * jelas, bukan halaman kosong.
 */

import { redirect } from "next/navigation";
import { getCurrentUser, type AuthUser } from "@/lib/api-helpers";
import { ShieldAlert } from "lucide-react";

export async function wajibLogin(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function wajibOwner(): Promise<AuthUser | null> {
  const user = await wajibLogin();
  return user.role === "OWNER" ? user : null;
}

export function Terlarang({ halaman }: { halaman: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-400" />
      <div>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-50">
          Halaman ini khusus owner
        </p>
        <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
          Akun kasir tidak punya akses ke {halaman}. Minta owner kalau ada yang perlu diubah.
        </p>
      </div>
    </div>
  );
}
