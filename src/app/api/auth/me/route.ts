import { withAuth, ok } from "@/lib/api-helpers";

/** Identitas + role SEGAR dari DB, dipakai layout untuk menyusun menu. */
export const GET = withAuth(async (_req, user) => ok({ user }));
