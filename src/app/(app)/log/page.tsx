import { wajibOwner, Terlarang } from "@/lib/guard";
import { PanelLog } from "./panel-log";

export const dynamic = "force-dynamic";

export default async function HalamanLog() {
  // PRD A10: "Audit tidak perlu dibuka ke kasir."
  const owner = await wajibOwner();
  if (!owner) return <Terlarang halaman="audit log" />;
  return <PanelLog />;
}
