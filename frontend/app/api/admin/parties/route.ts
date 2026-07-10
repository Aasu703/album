import { apiError, apiSuccess, requireAdminPassword } from "@/app/lib/security";
import { getSupabaseAdmin } from "@/app/lib/supabase-admin";
import type { AdminPartyRow } from "@/app/lib/types";

export const runtime = "nodejs";

/** Returns all parties with member counts for admin management. */
export async function GET(request: Request) {
  const unauthorized = requireAdminPassword(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const admin = getSupabaseAdmin();

    const [partiesResult, membersResult] = await Promise.all([
      admin
        .from("parties")
        .select("id, name, description, host_id, host_name, join_code, album_id, is_active, created_at, expires_at")
        .order("created_at", { ascending: false }),
      admin.from("party_members").select("party_id, user_id"),
    ]);

    if (partiesResult.error || membersResult.error) {
      return apiError(partiesResult.error?.message || membersResult.error?.message || "Failed to fetch parties.", 500);
    }

    const parties = (partiesResult.data ?? []) as Array<{
      id: string;
      name: string;
      description: string | null;
      host_id: string;
      host_name: string;
      join_code: string;
      album_id: string;
      is_active: boolean;
      created_at: string;
      expires_at: string | null;
    }>;

    const memberRows = (membersResult.data ?? []) as Array<{ party_id: string; user_id: string }>;

    const memberCountMap = memberRows.reduce<Map<string, number>>((acc, row) => {
      acc.set(row.party_id, (acc.get(row.party_id) ?? 0) + 1);
      return acc;
    }, new Map());

    const payload: AdminPartyRow[] = parties.map((party) => ({
      id: party.id,
      name: party.name,
      description: party.description,
      host_id: party.host_id,
      host_name: party.host_name,
      join_code: party.join_code,
      album_id: party.album_id,
      is_active: party.is_active,
      created_at: party.created_at,
      expires_at: party.expires_at,
      member_count: memberCountMap.get(party.id) ?? 0,
    }));

    return apiSuccess(payload, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch admin parties.";
    return apiError(message, 500);
  }
}