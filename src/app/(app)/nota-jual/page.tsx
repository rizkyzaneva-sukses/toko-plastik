import { wajibLogin } from "@/lib/guard";
import { PanelNotaJual } from "./panel-nota-jual";

export const dynamic = "force-dynamic";

export default async function HalamanNotaJual() {
  const user = await wajibLogin();
  // Kasir boleh melihat nota yang dia buat; hanya owner yang boleh void (A10).
  return <PanelNotaJual isOwner={user.role === "OWNER"} />;
}
