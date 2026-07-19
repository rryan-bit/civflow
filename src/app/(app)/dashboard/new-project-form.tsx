"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function NewProjectForm() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user!.id)
      .single();

    if (!profile?.company_id) {
      setError("Your account has no company assigned yet.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("projects").insert({
      name,
      site_address: siteAddress || null,
      company_id: profile.company_id,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setName("");
    setSiteAddress("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <input
        type="text"
        placeholder="Project name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="field"
      />
      <input
        type="text"
        placeholder="Site address (optional)"
        value={siteAddress}
        onChange={(e) => setSiteAddress(e.target.value)}
        className="field"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        {loading ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
