import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

/** PRD pasal 3: hanya dua peran. */
export type Role = "OWNER" | "KASIR";

export interface SessionData {
  userId?: string;
  nama?: string;
  isLoggedIn?: boolean;
  // CATATAN: role SENGAJA tidak disimpan di sini. Role selalu dibaca fresh dari
  // DB (lihat api-helpers.ts) supaya pencabutan hak berlaku seketika.
}

const RAHASIA_DEV = "dev_only_password_at_least_32_characters_long";

/**
 * Diperiksa saat dipakai, bukan saat file di-import. `next build` menjalankan
 * modul ini dengan NODE_ENV=production tanpa env produksi; kalau dilempar di
 * tingkat modul, build Docker ikut gagal padahal secretnya baru diinjeksi
 * EasyPanel saat runtime.
 */
function rahasiaSession(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET wajib diisi minimal 32 karakter di produksi. " +
        "Buat dengan: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return RAHASIA_DEV;
}

export function sessionOptions(): SessionOptions {
  return {
    password: rahasiaSession(),
    cookieName: process.env.SESSION_COOKIE_NAME || "toko_plastik_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    },
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions());
}
