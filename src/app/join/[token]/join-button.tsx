"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function JoinButton({ token }: { token: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.rpc("redeem_invite", { invite_token: token });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(data?.role === "field_worker" ? "/site" : "/dashboard");
    router.refresh();
  }

  return (
    <div>
      <Button onClick={handleJoin} loading={loading} className="w-full">
        {loading ? "Joining…" : "Join company"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
