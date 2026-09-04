/**
 * Pembungkus route handler. Middleware saja tidak cukup — API bisa dipanggil
 * langsung tanpa lewat navigasi halaman, jadi setiap handler tetap dijaga.
 * PRD A10: kasir yang mencoba void atau ubah HPP harus dapat 403.
 */

import { NextResponse } from "next/server";
import { getSession, type Role } from "@/lib/session";
import { getPrisma } from "@/lib/prisma";
import { AturanBisnisError, errorDomain } from "@/lib/errors";

export { AturanBisnisError };

export interface AuthUser {
  id: string;
  nama: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
}

/** Baca user + role SEGAR dari DB. Jangan pernah percaya role dari cookie. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;

  const user = await getPrisma().user.findFirst({
    where: { id: session.userId, isActive: true },
    select: { id: true, nama: true, username: true, role: true, mustChangePassword: true },
  });

  return (user as AuthUser) ?? null;
}

type Ctx = { params?: Promise<Record<string, string>> };
type Handler = (req: Request, user: AuthUser, ctx: Ctx) => Promise<Response> | Response;

const TOLAK_LOGIN = () =>
  NextResponse.json({ error: "Belum login", type: "auth_required" }, { status: 401 });

export function withAuth(handler: Handler) {
  return async (req: Request, ctx: Ctx) => {
    const user = await getCurrentUser();
    if (!user) return TOLAK_LOGIN();
    try {
      return await handler(req, user, ctx);
    } catch (e) {
      return apiError(e);
    }
  };
}

export function withRole(roles: Role[], handler: Handler) {
  return async (req: Request, ctx: Ctx) => {
    const user = await getCurrentUser();
    if (!user) return TOLAK_LOGIN();
    if (!roles.includes(user.role)) {
      console.warn(`[auth] Akses ditolak: ${user.username} (role ${user.role})`);
      return NextResponse.json(
        { error: "Anda tidak punya akses untuk tindakan ini.", type: "forbidden" },
        { status: 403 }
      );
    }
    try {
      return await handler(req, user, ctx);
    } catch (e) {
      return apiError(e);
    }
  };
}

/** PRD pasal 3: void, opname, master, audit, pinjaman — owner saja. */
export const withOwner = (h: Handler) => withRole(["OWNER"], h);

/** Baca body JSON; body rusak atau kosong jadi 400, bukan 500. */
export async function bacaJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const isi = await req.json();
    if (isi === null || typeof isi !== "object" || Array.isArray(isi)) {
      throw new AturanBisnisError("Data yang dikirim tidak berbentuk objek");
    }
    return isi as Record<string, unknown>;
  } catch (e) {
    if (e instanceof AturanBisnisError) throw e;
    throw new AturanBisnisError("Data yang dikirim tidak bisa dibaca");
  }
}

interface PrismaError {
  code?: string;
  meta?: { target?: string[] | string; field_name?: string };
}

/**
 * Terjemahkan error Prisma yang PASTI berasal dari input user menjadi pesan
 * yang bisa dibaca. Sisanya tetap 500 dan hanya masuk log server.
 */
function pesanPrisma(e: unknown): string | null {
  const p = e as PrismaError;
  const nama = (e as Error)?.name ?? "";

  // Nilai enum tidak dikenal / tipe kolom salah -> input user ngawur.
  if (nama === "PrismaClientValidationError") {
    return "Data yang dikirim tidak sesuai. Periksa lagi pilihan dan angkanya.";
  }

  switch (p.code) {
    case "P2002": {
      // Unique constraint. Bisa terjadi walau sudah dicek dulu, kalau dua
      // permintaan menyimpan data yang sama pada saat bersamaan.
      const t = p.meta?.target;
      const kolom = Array.isArray(t) ? t.join(", ") : t;
      return kolom
        ? `Data dengan ${kolom} yang sama sudah ada. Periksa daftar yang sudah tersimpan.`
        : "Data yang sama sudah ada.";
    }
    case "P2003":
      return "Data yang dirujuk tidak ditemukan. Muat ulang halaman lalu coba lagi.";
    case "P2025":
      return "Data yang dituju tidak ditemukan. Mungkin sudah diubah orang lain.";
    case "P2000":
      return "Ada isian yang terlalu panjang.";
    case "P2034":
      return "Transaksi bentrok dengan transaksi lain. Coba simpan sekali lagi.";
    default:
      return null;
  }
}

/**
 * Error domain -> 400 dengan pesan yang bisa dibaca kasir.
 * Error tak terduga -> 500 tanpa membocorkan isi dalam.
 */
export function apiError(error: unknown) {
  if (errorDomain(error)) {
    return NextResponse.json(
      { error: error.message, type: error.type },
      { status: 400 }
    );
  }

  const pesan = pesanPrisma(error);
  if (pesan) {
    console.warn("[api] input ditolak:", (error as Error)?.message);
    return NextResponse.json({ error: pesan, type: "input_ditolak" }, { status: 400 });
  }

  console.error("[api]", error);
  return NextResponse.json(
    { error: "Terjadi kesalahan di server", type: "server_error" },
    { status: 500 }
  );
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
