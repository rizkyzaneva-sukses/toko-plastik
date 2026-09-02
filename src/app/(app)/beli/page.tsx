import { wajibOwner, Terlarang } from "@/lib/guard";
import { PanelBeli } from "./panel-beli";

export const dynamic = "force-dynamic";

export default async function HalamanBeli() {
  const owner = await wajibOwner();
  if (!owner) return <Terlarang halaman="pembelian" />;
  return <PanelBeli />;
}
