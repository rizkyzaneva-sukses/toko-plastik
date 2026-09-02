/** Kelola user — owner saja. PRD pasal 3: kasir tidak boleh naikkan hak sendiri. */
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";
import { withOwner, ok, AturanBisnisError } from "@/lib/api-helpers";
import { catatAuditLepas } from "@/lib/audit";

export const GET = withOwner(async () => {
  const pengguna = await getPrisma().user.findMany({
    orderBy: [{ role: "asc" }, { nama: "asc" }],
    select: {
      id: true,
      nama: true,
      username: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
    },
  });
  return ok({ pengguna });
});

export const POST = withOwner(async (req, user) => {
  const b = await req.json();

  const nama = b.nama?.trim();
  const username = b.username?.trim().toLowerCase();
  const password = String(b.password ?? "");

  if (!nama) throw new AturanBisnisError("Nama wajib diisi");
  if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
    throw new AturanBisnisError("Username 3-20 karakter, hanya huruf kecil, angka, dan _");
  }
  if (password.length < 6) throw new AturanBisnisError("Password minimal 6 karakter");
  if (b.role !== "OWNER" && b.role !== "KASIR") {
    throw new AturanBisnisError("Role harus OWNER atau KASIR");
  }

  const db = getPrisma();
  if (await db.user.findUnique({ where: { username } })) {
    throw new AturanBisnisError(`Username "${username}" sudah dipakai`);
  }

  const baru = await db.user.create({
    data: { nama, username, role: b.role, passwordHash: await bcrypt.hash(password, 10) },
    select: { id: true, nama: true, username: true, role: true, isActive: true },
  });

  await catatAuditLepas({
    userId: user.id,
    aksi: "CREATE",
    entitas: "User",
    entitasId: baru.id,
    after: { nama, username, role: b.role },
    keterangan: `Tambah user ${username} (${b.role})`,
  });

  return ok({ pengguna: baru }, 201);
});
