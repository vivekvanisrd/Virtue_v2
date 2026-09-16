"use server";

import { createClient } from "../../supabase/client";

/**
 * Notifies every open session watching this branch that a collection changed,
 * so they can refetch (via the normal tenancy-scoped server actions) and show
 * it live. Deliberately a Broadcast channel, not a raw Postgres-Realtime
 * subscription on the Collection table: RLS is off on that table, so a raw
 * subscription would let anyone holding the public anon key listen to every
 * branch's fee collections, not just their own — a real tenancy leak. A
 * Broadcast payload carries no financial data at all, just "something in
 * this branch changed" — the actual numbers are always re-fetched through
 * the existing secure, branch-scoped server actions.
 */
export async function broadcastBranchUpdate(branchId: string) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const channel = supabase.channel(`simple-branch-${branchId}`);
    await channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: "collection-changed", payload: {} });
        setTimeout(() => supabase.removeChannel(channel), 1000);
      }
    });
  } catch {
    // Never let a realtime notification failure break the actual payment save.
  }
}
