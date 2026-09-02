/** Daftar nota terbuka tertua untuk layar pelunasan (PRD pasal 6.3). */
import { withAuth, ok, AturanBisnisError } from "@/lib/api-helpers";
import { notaTerbuka } from "@/lib/pembayaran";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const arah = url.searchParams.get("arah");
  const partyId = url.searchParams.get("party_id");

  if (arah !== "VENDOR" && arah !== "CUSTOMER") {
    throw new AturanBisnisError("Arah harus VENDOR atau CUSTOMER");
  }
  if (!partyId) throw new AturanBisnisError("Pihak belum dipilih");

  // Kasir hanya boleh menerima piutang customer (pasal 3). Hutang ke vendor
  // adalah urusan kas owner — daftarnya pun tidak dibuka ke kasir.
  if (arah === "VENDOR" && user.role !== "OWNER") {
    throw new AturanBisnisError("Hanya owner yang boleh melihat hutang ke vendor.");
  }

  return ok({ nota: await notaTerbuka(arah, partyId) });
});
