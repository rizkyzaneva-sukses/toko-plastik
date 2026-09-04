import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { catatAuditLepas } from "@/lib/audit";

// Rate limit sederhana per IP. Untuk multi-instance, pindahkan ke Redis/DB.
const percobaan = new Map<string, { n: number; sampai: number }>();
const MAKS = 5;
const JENDELA = 15 * 60 * 1000;

function kenaLimit(ip: string) {
  const now = Date.now();

  // Buang catatan yang sudah kedaluwarsa. Tanpa ini map tumbuh terus selama
  // proses hidup — kecil, tapi tidak ada gunanya dibiarkan bocor.
  if (percobaan.size > 500) {
    for (const [kunci, nilai] of percobaan) {
      if (now > nilai.sampai) percobaan.delete(kunci);
    }
  }

  const rec = percobaan.get(ip);
  if (!rec || now > rec.sampai) {
    percobaan.set(ip, { n: 1, sampai: now + JENDELA });
    return false;
  }
  rec.n += 1;
  return rec.n > MAKS;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (kenaLimit(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan login. Coba lagi 15 menit lagi." },
      { status: 429 }
    );
  }

  let username: unknown;
  let password: unknown;
  try {
    ({ username, password } = await req.json());
  } catch {
    return NextResponse.json({ error: "Data login tidak bisa dibaca" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
  }

  const user = await getPrisma().user.findFirst({
    where: { username: String(username).toLowerCase().trim(), isActive: true },
  });

  // Pesan sengaja generik — jangan bocorkan mana yang salah.
  const gagal = NextResponse.json({ error: "Username atau password salah" }, { status: 401 });

  if (!user?.passwordHash) return gagal;
  if (!(await bcrypt.compare(String(password), user.passwordHash))) return gagal;

  const session = await getSession();
  session.userId = user.id;
  session.nama = user.nama;
  session.isLoggedIn = true;
  await session.save();

  await getPrisma().user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await catatAuditLepas({
    userId: user.id,
    aksi: "LOGIN",
    entitas: "User",
    entitasId: user.id,
    keterangan: `${user.nama} login`,
  });

  percobaan.delete(ip);

  // PRD pasal 14: password seed wajib diganti setelah login pertama.
  if (user.mustChangePassword) {
    return NextResponse.json({ ok: true, nama: user.nama, role: user.role, mustChangePassword: true });
  }

  return NextResponse.json({ ok: true, nama: user.nama, role: user.role });
}
