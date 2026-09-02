import { wajibLogin } from "@/lib/guard";
import { PanelStok } from "./panel-stok";

export const dynamic = "force-dynamic";

export default async function HalamanStok() {
  const user = await wajibLogin();
  return <PanelStok isOwner={user.role === "OWNER"} />;
}
