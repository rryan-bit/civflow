import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// --- Types for the structured output we ask Claude for --------------------

type ExtractedLabor = {
  trade: string;
  worker_count: number;
  hours: number | null;
  notes: string | null;
};

type ExtractedEquipment = {
  equipment_name: string;
  hours_used: number | null;
  notes: string | null;
};

type ExtractedWeather = {
  condition: string | null;
  temp_c: number | null;
  wind_kph: number | null;
  rainfall_mm: number | null;
};

type ExtractedSafety = {
  severity: "info" | "minor" | "major" | "incident";
  description: string;
  action_taken: string | null;
};

type ExtractionResult = {
  progress_summary: string;
  percent_complete: number | null;
  labor: ExtractedLabor[];
  equipment: ExtractedEquipment[];
  weather: ExtractedWeather | null;
  safety_observations: ExtractedSafety[];
  delays: string[];
  missing_information: string[];
  outstanding_actions: string[];
};

const RECORD_TOOL_NAME = "record_site_diary";

const RECORD_TOOL: Anthropic.Tool = {
  name: RECORD_TOOL_NAME,
  description:
    "Record structured site diary data extracted from a supervisor's voice note transcript and site photos. Only include what's actually stated or clearly visible — never invent numbers.",
  input_schema: {
    type: "object",
    properties: {
      progress_summary: {
        type: "string",
        description: "A concise (2-4 sentence) progress narrative suitable for a client-facing update.",
      },
      percent_complete: {
        type: "number",
        description: "Estimated overall project completion percentage (0-100), only if it can be reasonably inferred. Omit if unknown.",
      },
      labor: {
        type: "array",
        description: "Trades/crews on site and headcount. Empty array if none mentioned.",
        items: {
          type: "object",
          properties: {
            trade: { type: "string", description: "e.g. 'Excavation crew', 'Concreters', 'Electricians'" },
            worker_count: { type: "integer" },
            hours: { type: "number", description: "Hours worked, if mentioned. Omit if unknown." },
            notes: { type: "string", description: "Any relevant detail. Omit if none." },
          },
          required: ["trade", "worker_count"],
        },
      },
      equipment: {
        type: "array",
        description: "Equipment/machinery used on site. Empty array if none mentioned.",
        items: {
          type: "object",
          properties: {
            equipment_name: { type: "string", description: "e.g. 'Excavator (20t)', 'Concrete pump'" },
            hours_used: { type: "number", description: "Omit if unknown." },
            notes: { type: "string", description: "e.g. downtime, issues. Omit if none." },
          },
          required: ["equipment_name"],
        },
      },
      weather: {
        type: "object",
        description: "Weather conditions, only if mentioned or clearly visible in photos. Omit entirely if not discernible.",
        properties: {
          condition: { type: "string", description: "e.g. 'Sunny', 'Light rain', 'Overcast'" },
          temp_c: { type: "number" },
          wind_kph: { type: "number" },
          rainfall_mm: { type: "number" },
        },
      },
      safety_observations: {
        type: "array",
        description: "Any safety-relevant observations, hazards, near-misses, or incidents mentioned. Empty array if none.",
        items: {
          type: "object",
          properties: {
            severity: { type: "string", enum: ["info", "minor", "major", "incident"] },
            description: { type: "string" },
            action_taken: { type: "string", description: "Omit if none taken/mentioned." },
          },
          required: ["severity", "description"],
        },
      },
      delays: {
        type: "array",
        description: "Any delays mentioned (weather, deliveries, access, approvals, etc.), each as a short plain-English sentence. Empty array if none.",
        items: { type: "string" },
      },
      missing_information: {
        type: "array",
        description: "Things a reviewer would likely want but weren't captured — e.g. 'No headcount given for the electrical subcontractor', 'No photo of the completed pour'. Empty array if the entry seems complete.",
        items: { type: "string" },
      },
      outstanding_actions: {
        type: "array",
        description: "Action items implied by the entry that someone needs to follow up on — e.g. 'Confirm concrete supplier for tomorrow's pour'. Empty array if none.",
        items: { type: "string" },
      },
    },
    required: [
      "progress_summary",
      "labor",
      "equipment",
      "safety_observations",
      "delays",
      "missing_information",
      "outstanding_actions",
    ],
  },
};

const IMAGE_EXTENSIONS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function guessImageMediaType(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return IMAGE_EXTENSIONS[ext] ?? null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString("base64");
}

/**
 * Transcribes a voice note via OpenAI's Whisper API. Returns null (and
 * leaves the entry untranscribed) if OPENAI_API_KEY isn't configured —
 * extraction still runs on photos + any existing transcript.
 */
async function transcribeAudio(audioBlob: Blob, filename: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const form = new FormData();
  form.append("file", audioBlob, filename);
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    console.error("Whisper transcription failed:", await res.text());
    return null;
  }

  const data = (await res.json()) as { text?: string };
  return data.text ?? null;
}

export type RunExtractionResult =
  | { ok: true; recordCounts: { labor: number; equipment: number; safety: number; weather: boolean } }
  | { ok: false; error: string };

export async function runExtraction(entryId: string): Promise<RunExtractionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not configured on the server." };
  }

  const supabase = await createClient();

  const { data: entry, error: entryError } = await supabase
    .from("diary_entries")
    .select("id, project_id, status")
    .eq("id", entryId)
    .single();

  if (entryError || !entry) {
    return { ok: false, error: entryError?.message ?? "Diary entry not found." };
  }

  const [{ data: media }, { data: voiceNotes }] = await Promise.all([
    supabase.from("media_assets").select("id, kind, storage_path, caption").eq("diary_entry_id", entryId),
    supabase.from("voice_notes").select("id, storage_path, transcript").eq("diary_entry_id", entryId),
  ]);

  // 1. Transcribe any voice notes that don't have a transcript yet.
  let transcript = "";
  for (const note of voiceNotes ?? []) {
    if (note.transcript) {
      transcript += note.transcript + "\n";
      continue;
    }
    const { data: audioBlob, error: dlError } = await supabase.storage.from("diary-media").download(note.storage_path);
    if (dlError || !audioBlob) continue;

    const text = await transcribeAudio(audioBlob, note.storage_path.split("/").pop() ?? "voice-note.webm");
    if (text) {
      transcript += text + "\n";
      await supabase.from("voice_notes").update({ transcript: text }).eq("id", note.id);
    }
  }

  // 2. Pull down photos (capped) and base64-encode them for Claude vision.
  const photoAssets = (media ?? []).filter((m) => m.kind === "photo").slice(0, 6);
  const imageBlocks: Anthropic.ImageBlockParam[] = [];

  for (const asset of photoAssets) {
    const mediaType = guessImageMediaType(asset.storage_path);
    if (!mediaType) continue;

    const { data: blob, error: dlError } = await supabase.storage.from("diary-media").download(asset.storage_path);
    if (dlError || !blob) continue;

    imageBlocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        data: await blobToBase64(blob),
      },
    });
  }

  if (!transcript.trim() && imageBlocks.length === 0) {
    return { ok: false, error: "This entry has no voice note transcript and no readable photos to analyze yet." };
  }

  // 3. Ask Claude to extract structured records.
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const promptText = [
    "You're helping a civil construction supervisor turn a site visit into structured diary records.",
    transcript.trim()
      ? `Voice note transcript:\n"""\n${transcript.trim()}\n"""`
      : "No voice note transcript is available for this entry — work from the photos only.",
    imageBlocks.length
      ? `${imageBlocks.length} site photo(s) are attached below.`
      : "No usable photos are attached for this entry.",
    "Call the record_site_diary tool with what you can determine. Leave out fields you can't reasonably infer — do not guess or invent numbers.",
  ].join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    tools: [RECORD_TOOL],
    tool_choice: { type: "tool", name: RECORD_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: promptText }, ...imageBlocks],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === RECORD_TOOL_NAME
  );

  if (!toolUse) {
    return { ok: false, error: "Claude didn't return structured data. Try again." };
  }

  const result = toolUse.input as ExtractionResult;

  // 4. Write the extracted records into their tables.
  // (PostgrestFilterBuilder is PromiseLike, not a full Promise, hence this type.)
  const inserts: PromiseLike<unknown>[] = [];

  if (result.labor?.length) {
    inserts.push(
      supabase.from("labor_records").insert(
        result.labor.map((l) => ({
          diary_entry_id: entryId,
          trade: l.trade,
          worker_count: l.worker_count ?? 0,
          hours: l.hours ?? null,
          notes: l.notes ?? null,
        }))
      )
    );
  }

  if (result.equipment?.length) {
    inserts.push(
      supabase.from("equipment_records").insert(
        result.equipment.map((e) => ({
          diary_entry_id: entryId,
          equipment_name: e.equipment_name,
          hours_used: e.hours_used ?? null,
          notes: e.notes ?? null,
        }))
      )
    );
  }

  if (result.weather) {
    inserts.push(
      supabase.from("weather_logs").insert({
        diary_entry_id: entryId,
        condition: result.weather.condition ?? null,
        temp_c: result.weather.temp_c ?? null,
        wind_kph: result.weather.wind_kph ?? null,
        rainfall_mm: result.weather.rainfall_mm ?? null,
        source: "auto",
      })
    );
  }

  if (result.safety_observations?.length) {
    inserts.push(
      supabase.from("safety_observations").insert(
        result.safety_observations.map((s) => ({
          diary_entry_id: entryId,
          severity: s.severity,
          description: s.description,
          action_taken: s.action_taken ?? null,
        }))
      )
    );
  }

  inserts.push(
    supabase.from("progress_notes").insert({
      diary_entry_id: entryId,
      summary: result.progress_summary,
      percent_complete: result.percent_complete ?? null,
      delays: result.delays?.length ? result.delays : null,
      missing_information: result.missing_information?.length ? result.missing_information : null,
      outstanding_actions: result.outstanding_actions?.length ? result.outstanding_actions : null,
    })
  );

  await Promise.all(inserts);

  await supabase.from("diary_entries").update({ status: "in_review" }).eq("id", entryId);

  return {
    ok: true,
    recordCounts: {
      labor: result.labor?.length ?? 0,
      equipment: result.equipment?.length ?? 0,
      safety: result.safety_observations?.length ?? 0,
      weather: Boolean(result.weather),
    },
  };
}
