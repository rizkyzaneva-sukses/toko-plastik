import { wajibOwner, Terlarang } from "@/lib/guard";
import { PanelPinjaman } from "./panel-pinjaman";

export const dynamic = "force-dynamic";

export default async function HalamanPinjaman() {
  const owner = await wajibOwner();
  if (!owner) return <Terlarang halaman="pinjaman owner" />;
  return <PanelPinjaman />;
}
