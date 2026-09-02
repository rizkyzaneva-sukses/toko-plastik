import { wajibOwner, Terlarang } from "@/lib/guard";
import { PanelMaster } from "./panel-master";

export const dynamic = "force-dynamic";

export default async function HalamanMaster() {
  const owner = await wajibOwner();
  if (!owner) return <Terlarang halaman="master data" />;
  return <PanelMaster />;
}
