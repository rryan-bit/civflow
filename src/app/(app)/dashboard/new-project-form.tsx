"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <form onSubmit={handleSubmit} className="mt-2 space-y-3">
      <input
        type="text"
        placeholder="Project name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      <input
        type="text"
        placeholder="Site address (optional)"
        value={siteAddress}
        onChange={(e) => setSiteAddress(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}
