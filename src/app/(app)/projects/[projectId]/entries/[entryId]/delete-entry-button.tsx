"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function DeleteEntryButton({ entryId, projectId }: { entryId: string; projectId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm("Delete this diary entry? Its photos, voice note, and drafted records will be removed too. This can't be undone.");
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await supabase.from("diary_entries").delete().eq("id", entryId);
    setDeleting(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/projects/${projectId}`);
    router.refresh();
  }

  return (
    <div>
      <Button
        type="button"
        onClick={handleDelete}
        loading={deleting}
        variant="outline"
        size="sm"
        className="!border-red-300 !text-red-700 hover:!bg-red-50 dark:!border-red-800 dark:!text-red-400 dark:hover:!bg-red-950/40"
      >
        {deleting ? "Deleting…" : "Delete entry"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
