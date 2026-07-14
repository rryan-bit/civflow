"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RecorderState = "idle" | "recording" | "recorded";

export default function CaptureForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [photos, setPhotos] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        setVoiceBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecorderState("recording");
    } catch {
      setError("Couldn't access the microphone. Check browser permissions.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecorderState("recorded");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      // 1. Create the diary entry shell (status: draft).
      const { data: entry, error: entryError } = await supabase
        .from("diary_entries")
        .insert({ project_id: projectId, created_by: user.id, status: "draft" })
        .select("id")
        .single();
      if (entryError || !entry) throw new Error(entryError?.message ?? "Could not create entry.");

      const entryId = entry.id;
      const uploads: Promise<unknown>[] = [];

      // 2. Upload photos.
      photos.forEach((file, i) => {
        const path = `${entryId}/photo-${i}-${file.name}`;
        uploads.push(
          supabase.storage
            .from("diary-media")
            .upload(path, file)
            .then(async ({ error }) => {
              if (error) throw error;
              await supabase
                .from("media_assets")
                .insert({ diary_entry_id: entryId, kind: "photo", storage_path: path });
            })
        );
      });

      // 3. Upload documents.
      documents.forEach((file, i) => {
        const path = `${entryId}/doc-${i}-${file.name}`;
        uploads.push(
          supabase.storage
            .from("diary-media")
            .upload(path, file)
            .then(async ({ error }) => {
              if (error) throw error;
              await supabase
                .from("media_assets")
                .insert({ diary_entry_id: entryId, kind: "document", storage_path: path });
            })
        );
      });

      // 4. Upload the voice note.
      if (voiceBlob) {
        const path = `${entryId}/voice-note.webm`;
        uploads.push(
          supabase.storage
            .from("diary-media")
            .upload(path, voiceBlob)
            .then(async ({ error }) => {
              if (error) throw error;
              await supabase.from("voice_notes").insert({ diary_entry_id: entryId, storage_path: path });
            })
        );
      }

      await Promise.all(uploads);

      // AI extraction (transcription + structured drafting) runs as a
      // separate step, added in Phase 2 of the build plan. For now the
      // entry sits in "draft" with its raw media attached.
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700">Site photos</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
          className="mt-1 block w-full text-sm"
        />
        {photos.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">{photos.length} photo(s) selected</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Voice summary</label>
        <div className="mt-1 flex items-center gap-3">
          {recorderState !== "recording" ? (
            <button
              type="button"
              onClick={startRecording}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
            >
              🎙 Record
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
            >
              ■ Stop
            </button>
          )}
          {recorderState === "recorded" && (
            <span className="text-xs text-emerald-600">Voice note captured</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Documents (optional)</label>
        <input
          type="file"
          multiple
          onChange={(e) => setDocuments(Array.from(e.target.files ?? []))}
          className="mt-1 block w-full text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save entry"}
      </button>
    </form>
  );
}
