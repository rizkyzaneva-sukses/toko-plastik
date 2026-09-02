import { wajibLogin } from "@/lib/guard";
import { LayarKasir } from "./layar-kasir";

export const dynamic = "force-dynamic";

export default async function HalamanKasir() {
  await wajibLogin();
  return <LayarKasir />;
}
