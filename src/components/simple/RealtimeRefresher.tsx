"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/**
 * Mount on any /simple page that shows fee numbers. Subscribes to one or
 * more branch channels and calls router.refresh() the instant anyone,
 * anywhere, records a payment in that branch — so every open session stays
 * live without a manual reload. See realtime.ts for why this uses Broadcast
 * (a "something changed" ping) rather than a raw Postgres subscription.
 */
export function RealtimeRefresher({ branchIds }: { branchIds: (string | null | undefined)[] }) {
  const router = useRouter();
  const ids = branchIds.filter(Boolean) as string[];
  const key = ids.slice().sort().join(",");
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (ids.length === 0) return;
    const channels = ids.map((id) =>
      supabase
        .channel(`simple-branch-${id}`)
        .on("broadcast", { event: "collection-changed" }, () => routerRef.current.refresh())
        .subscribe()
    );
    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
