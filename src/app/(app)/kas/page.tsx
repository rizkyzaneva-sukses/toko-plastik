import { wajibOwner, Terlarang } from "@/lib/guard";
import { PanelKas } from "./panel-kas";

export const dynamic = "force-dynamic";

export default async function HalamanKas() {
  const owner = await wajibOwner();
  if (!owner) return <Terlarang halaman="kas" />;
  return <PanelKas />;
}
