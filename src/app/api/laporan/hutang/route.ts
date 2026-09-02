import { withOwner, ok } from "@/lib/api-helpers";
import { laporanHutang } from "@/lib/laporan";

export const GET = withOwner(async () => ok({ hutang: await laporanHutang() }));
