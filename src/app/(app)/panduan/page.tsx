import { wajibLogin } from "@/lib/guard";
import { PanelPanduan } from "./panel-panduan";

export const dynamic = "force-dynamic";

export default async function HalamanPanduan() {
  const user = await wajibLogin();
  return <PanelPanduan role={user.role} nama={user.nama} />;
}
