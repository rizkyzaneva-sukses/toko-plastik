import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/prisma";
import { withAuth, ok, AturanBisnisError } from "@/lib/api-helpers";
import { catatAuditLepas } from "@/lib/audit";

export const POST = withAuth(async (req, user) => {
  const { passwordLama, passwordBaru } = await req.json();

  if (!passwordLama || !passwordBaru) {
    throw new AturanBisnisError("Password lama dan baru wajib diisi");
  }
  if (String(passwordBaru).length < 6) {
    throw new AturanBisnisError("Password baru minimal 6 karakter");
  }

  const db = getPrisma();
  const row = await db.user.findUnique({ where: { id: user.id } });
  if (!row || !(await bcrypt.compare(String(passwordLama), row.passwordHash))) {
    throw new AturanBisnisError("Password lama salah");
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(String(passwordBaru), 10),
      mustChangePassword: false,
    },
  });

  await catatAuditLepas({
    userId: user.id,
    aksi: "UPDATE",
    entitas: "User",
    entitasId: user.id,
    keterangan: `${user.nama} mengganti password sendiri`,
  });

  return ok({ ok: true });
});
