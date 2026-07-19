"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const photoPreviews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);

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

    if (!navigator.onLine) {
      setError("You're offline — photos and voice notes can't upload until you're back on signal. Nothing has been lost yet; just try again once connected.");
      return;
    }

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
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <Card className="p-5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Site photos</label>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-8 text-slate-500 transition-colors hover:border-brand-orange/50 hover:bg-orange-50/50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-orange-500/5"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="text-sm font-medium">{photos.length > 0 ? `${photos.length} photo(s) selected` : "Tap to add photos"}</span>
        </button>
        {photoPreviews.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {photoPreviews.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="aspect-square animate-scale-in rounded-lg object-cover" />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Voice summary</label>
        <div className="mt-3 flex flex-col items-center gap-3">
          {recorderState !== "recording" ? (
            <button
              type="button"
              onClick={startRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg shadow-slate-900/20 transition-transform active:scale-95 dark:bg-brand-orange"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0M12 19v3" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/30 transition-transform active:scale-95"
              style={{ animation: "pulse-ring 1.5s ease-out infinite" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <style>{`@keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgb(220 38 38 / 0.4);} 100% { box-shadow: 0 0 0 14px rgb(220 38 38 / 0);} }`}</style>
            </button>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {recorderState === "recording" ? "Recording… tap to stop" : recorderState === "recorded" ? "Voice note captured ✓" : "Tap to record"}
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Documents (optional)</label>
        <input ref={docInputRef} type="file" multiple onChange={(e) => setDocuments(Array.from(e.target.files ?? []))} className="hidden" />
        <button
          type="button"
          onClick={() => docInputRef.current?.click()}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-4 text-sm text-slate-500 transition-colors hover:border-brand-orange/50 hover:bg-orange-50/50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-orange-500/5"
        >
          {documents.length > 0 ? `${documents.length} document(s) selected` : "Tap to attach documents"}
        </button>
      </Card>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Button type="submit" loading={submitting} className="w-full" size="lg">
        {submitting ? "Saving…" : "Save entry"}
      </Button>
    </form>
  );
}
