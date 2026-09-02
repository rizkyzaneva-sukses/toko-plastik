import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api-helpers";
import { AppShell } from "@/components/layout/app-shell";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  // Role dibaca fresh dari DB di sini, bukan dari cookie.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <AppShell user={user}>{children}</AppShell>;
}
