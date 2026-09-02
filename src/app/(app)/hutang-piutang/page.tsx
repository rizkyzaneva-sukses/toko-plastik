import { wajibLogin } from "@/lib/guard";
import { PanelPelunasan } from "./panel-pelunasan";

export const dynamic = "force-dynamic";

export default async function HalamanHutangPiutang() {
  const user = await wajibLogin();
  // Kasir boleh menerima pelunasan piutang, tidak boleh membayar hutang vendor.
  return <PanelPelunasan isOwner={user.role === "OWNER"} />;
}
