"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PhotoCaption({ mediaId, initialCaption }: { mediaId: string; initialCaption: string | null }) {
  const supabase = createClient();
  const [caption, setCaption] = useState(initialCaption ?? "");
  const [saved, setSaved] = useState(true);

  async function handleBlur() {
    if (saved) return;
    await supabase.from("media_assets").update({ caption: caption.trim() || null }).eq("id", mediaId);
    setSaved(true);
  }

  return (
    <>
      <input
        type="text"
        value={caption}
        placeholder="Add a caption…"
        onChange={(e) => {
          setCaption(e.target.value);
          setSaved(false);
        }}
        onBlur={handleBlur}
        className="mt-1 w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 focus:border-slate-400 dark:focus:border-slate-500 focus:outline-none print:hidden"
      />
      {/* Print gets static text instead of an empty-looking input box. */}
      {caption && <p className="mt-1 hidden text-xs text-black print:block">{caption}</p>}
    </>
  );
}
