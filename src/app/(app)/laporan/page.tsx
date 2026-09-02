import { wajibOwner, Terlarang } from "@/lib/guard";
import { PanelLaporan } from "./panel-laporan";

export const dynamic = "force-dynamic";

export default async function HalamanLaporan() {
  const owner = await wajibOwner();
  if (!owner) return <Terlarang halaman="Report" />;
  return <PanelLaporan />;
}
