"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RemoveHoursButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setRemoving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("delete_my_hours", { entry_id: entryId });
    setRemoving(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={remove}
        disabled={removing}
        className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
      >
        Remove
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
