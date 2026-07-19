import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";
import { toDateInput, addDays, addBusinessDays } from "@/lib/dates";

// Lets the dashboard's "upload a document" widget do more than just file
// something away: Claude classifies the document and, if it clearly
// represents billable data (a materials invoice/docket, a subcontractor
// quote, or this contractor's own payment claim), also creates the matching
// structured record — so a supplier docket or a subbie's quote doesn't just
// sit in a folder, it actually lands in the right register.

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

function isPdf(path: string): boolean {
  return path.split(".").pop()?.toLowerCase() === "pdf";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = Buffer.from(await blob.arrayBuffer());
  return buffer.toString("base64");
}

const FILE_DOCUMENT_TOOL_NAME = "file_document";

const FILE_DOCUMENT_TOOL: Anthropic.Tool = {
  name: FILE_DOCUMENT_TOOL_NAME,
  description:
    "Classify an uploaded project document and extract any structured, billable data it contains — as much detail as the document actually shows, not just a single headline figure. Never invent figures, names, dates, or line items that aren't actually in the document; if a field isn't stated, leave it out rather than guessing.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short, human-readable title, e.g. 'Bunnings materials invoice' or 'ABC Plumbing quote'." },
      category: { type: "string", enum: ["contract", "insurance", "plans", "permit", "other"], description: "Best-fit document category." },
      record_type: {
        type: "string",
        enum: ["none", "material_order", "subcontractor_quote", "payment_claim", "qbcc_notice", "equipment_hire"],
        description:
          "What kind of structured record this document represents, if any. Use 'none' for things like insurance certificates, plans, or permits with no billable figures. Use 'qbcc_notice' for an official notice/letter from the QBCC (Queensland Building and Construction Commission) — most commonly a Direction to Rectify defective or incomplete work. Use 'equipment_hire' for an invoice or agreement hiring plant, tools, scaffolding, site facilities, or other equipment — not for subcontracted labour (that's subcontractor_quote) or bulk materials (that's material_order).",
      },
      material_order: {
        type: "object",
        description: "Only include if record_type is material_order — a supplier invoice, delivery docket, or quote for materials.",
        properties: {
          description: { type: "string", description: "What the materials are." },
          supplier: { type: "string" },
          quantity_ordered: { type: "number" },
          unit: { type: "string", description: "e.g. m3, bags, each." },
          cost: { type: "number", description: "Total cost in AUD." },
          status: { type: "string", enum: ["ordered", "delivered"], description: "'delivered' if this looks like a delivery docket/receipt for goods already received, otherwise 'ordered'." },
        },
      },
      subcontractor_quote: {
        type: "object",
        description:
          "Only include if record_type is subcontractor_quote — a quote or invoice from a subcontractor/trade for work on this project. Extract every detail the document actually shows, not just the total.",
        properties: {
          company_name: { type: "string" },
          trade: { type: "string" },
          description: { type: "string", description: "Overall description of what the quote covers." },
          amount: { type: "number", description: "The total quoted/invoiced amount in AUD (inc. GST if stated) — the grand total, not a line item." },
          licence_number: { type: "string", description: "The subcontractor's own QBCC licence number, if shown on the document (e.g. in a letterhead or footer)." },
          contact_name: { type: "string", description: "A named contact person for the subcontractor, if given." },
          contact_phone: { type: "string" },
          contact_email: { type: "string" },
          line_items: {
            type: "array",
            description: "Every individual scope item / job / cost line the document itemises, in the order they appear. Omit this entirely if the document only gives a single total with no breakdown.",
            items: {
              type: "object",
              properties: {
                description: { type: "string", description: "What this specific line item / job is." },
                amount: { type: "number", description: "This line's cost in AUD, if stated." },
                date: { type: "string", description: "YYYY-MM-DD — only if this specific line item has its own date (e.g. a dated invoice line for work done that day). Leave out if the document doesn't date individual lines." },
              },
              required: ["description"],
            },
          },
        },
      },
      payment_claim: {
        type: "object",
        description: "Only include if record_type is payment_claim — this contractor's own claim/invoice being sent to their client for this project.",
        properties: {
          claim_number: { type: "string" },
          amount_claimed: { type: "number" },
          due_date: { type: "string", description: "YYYY-MM-DD, if stated." },
        },
      },
      qbcc_notice: {
        type: "object",
        description: "Only include if record_type is qbcc_notice — an official QBCC letter, most commonly a Direction to Rectify.",
        properties: {
          description: { type: "string", description: "What defective or incomplete work the notice covers, in plain English." },
          due_date: { type: "string", description: "The compliance/rectification due date stated on the notice, as YYYY-MM-DD, if given. The usual statutory clock is 35 days from issue if no date is stated." },
        },
      },
      equipment_hire: {
        type: "object",
        description:
          "Only include if record_type is equipment_hire — one entry per distinct piece of equipment/plant/tool/site facility actually hired. Do NOT include ancillary line items like delivery fees, damage waivers, or servicing charges as separate equipment entries; fold their cost into the equipment item they relate to, or into the closest relevant item, rather than inventing a fake 'equipment' entry for a fee.",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "The equipment itself, e.g. '5.0T mini excavator', 'Mobile scaffold — 24m2', 'Site fencing'." },
                category: { type: "string", description: "e.g. Plant, Scaffolding, Site facilities, Power tool." },
                hire_company: { type: "string", description: "The hire company's name." },
                cost_per_day: { type: "number", description: "Only include if the document states a clean per-day (or per-week — convert to an equivalent daily figure) rate for this specific item. Leave out if the pricing is a flat fee or you'd have to guess." },
                total_cost: { type: "number", description: "This item's total cost in AUD for the hire period, inc. any fees/waivers reasonably attributable to it." },
                hire_start_date: { type: "string", description: "YYYY-MM-DD, if stated." },
                hire_end_date: { type: "string", description: "YYYY-MM-DD, if stated." },
              },
              required: ["name"],
            },
          },
        },
      },
    },
    required: ["title", "category", "record_type"],
  },
};

type FileDocumentResult = {
  title: string;
  category: "contract" | "insurance" | "plans" | "permit" | "other";
  record_type: "none" | "material_order" | "subcontractor_quote" | "payment_claim" | "qbcc_notice" | "equipment_hire";
  material_order?: { description?: string; supplier?: string; quantity_ordered?: number; unit?: string; cost?: number; status?: "ordered" | "delivered" };
  subcontractor_quote?: {
    company_name?: string;
    trade?: string;
    description?: string;
    amount?: number;
    licence_number?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    line_items?: { description: string; amount?: number; date?: string }[];
  };
  payment_claim?: { claim_number?: string; amount_claimed?: number; due_date?: string };
  qbcc_notice?: { description?: string; due_date?: string };
  equipment_hire?: {
    items?: {
      name: string;
      category?: string;
      hire_company?: string;
      cost_per_day?: number;
      total_cost?: number;
      hire_start_date?: string;
      hire_end_date?: string;
    }[];
  };
};

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 400 });
  }

  const { projectId } = await params;
  const { storagePath, fileName, instruction } = (await request.json()) as {
    storagePath?: string;
    fileName?: string;
    instruction?: string;
  };
  if (!storagePath) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(supabase, RATE_LIMITS.documentFile);
  if (!allowed) return rateLimitResponse();

  const { data: project } = await supabase.from("projects").select("id, name, company_id").eq("id", projectId).single();
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: fileBlob, error: dlError } = await supabase.storage.from("diary-media").download(storagePath);
  if (dlError || !fileBlob) {
    return NextResponse.json({ error: "Couldn't read the uploaded file." }, { status: 400 });
  }

  const displayName = fileName || storagePath.split("/").pop() || "Document";
  const imageMediaType = guessImageMediaType(storagePath);
  const pdf = isPdf(storagePath);

  // Can't feed this file type to Claude (e.g. .docx, .xlsx) — file it as-is,
  // no extraction attempted, rather than failing the upload outright.
  if (!imageMediaType && !pdf) {
    const { error: insertError } = await supabase.from("documents").insert({
      project_id: projectId,
      category: "other",
      title: displayName,
      storage_path: storagePath,
      file_name: displayName,
      uploaded_by: user.id,
    });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({
      title: displayName,
      category: "other",
      recordType: "none",
      summary: `Filed "${displayName}" under Documents. This file type can't be read by AI, so no data was extracted from it.`,
      href: `/projects/${projectId}/documents`,
    });
  }

  const contentBlock: Anthropic.ImageBlockParam | Anthropic.DocumentBlockParam = pdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: await blobToBase64(fileBlob) } }
    : {
        type: "image",
        source: { type: "base64", media_type: imageMediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: await blobToBase64(fileBlob) },
      };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const promptText = [
    `You're filing a document uploaded to the "${project.name}" construction project.`,
    instruction?.trim() ? `The person uploading it said: "${instruction.trim()}"` : "No extra context was given — work from the document itself.",
    "Call the file_document tool with your best classification and, if the document clearly represents billable data, the matching structured fields.",
  ].join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    tools: [FILE_DOCUMENT_TOOL],
    tool_choice: { type: "tool", name: FILE_DOCUMENT_TOOL_NAME },
    messages: [{ role: "user", content: [{ type: "text", text: promptText }, contentBlock] }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === FILE_DOCUMENT_TOOL_NAME
  );
  if (!toolUse) {
    return NextResponse.json({ error: "Claude couldn't read this document. Try again." }, { status: 500 });
  }

  const result = toolUse.input as FileDocumentResult;
  const title = result.title || displayName;

  const { data: docRow, error: docError } = await supabase
    .from("documents")
    .insert({
      project_id: projectId,
      category: result.category,
      title,
      storage_path: storagePath,
      file_name: displayName,
      uploaded_by: user.id,
    })
    .select("id")
    .single();
  if (docError || !docRow) {
    return NextResponse.json({ error: docError?.message ?? "Couldn't save the document." }, { status: 500 });
  }

  let recordSummary: string | null = null;
  let recordHref: string | null = null;

  const materialOrder = result.material_order;
  const subcontractorQuote = result.subcontractor_quote;
  const paymentClaim = result.payment_claim;
  const qbccNotice = result.qbcc_notice;
  const equipmentHire = result.equipment_hire;

  if (result.record_type === "material_order" && materialOrder?.description) {
    const description = materialOrder.description;
    const delivered = materialOrder.status === "delivered";
    const { error } = await supabase.from("materials").insert({
      project_id: projectId,
      description,
      supplier: materialOrder.supplier || null,
      quantity_ordered: typeof materialOrder.quantity_ordered === "number" ? materialOrder.quantity_ordered : null,
      unit: materialOrder.unit || null,
      cost: typeof materialOrder.cost === "number" ? materialOrder.cost : null,
      status: delivered ? "delivered" : "ordered",
      received_date: delivered ? toDateInput(new Date()) : null,
      quantity_received: delivered && typeof materialOrder.quantity_ordered === "number" ? materialOrder.quantity_ordered : null,
      created_by: user.id,
    });
    if (!error) {
      recordSummary = `Logged a material order: "${description}".`;
      recordHref = `/projects/${projectId}/materials`;
    }
  } else if (result.record_type === "subcontractor_quote" && subcontractorQuote?.company_name) {
    const companyName = subcontractorQuote.company_name;
    let subcontractorId: string | null = null;
    const { data: existingSub } = await supabase
      .from("subcontractors")
      .select("id, trade, qbcc_licence_number, contact_name, contact_phone, contact_email")
      .eq("project_id", projectId)
      .ilike("company_name", companyName)
      .maybeSingle();
    if (existingSub) {
      subcontractorId = existingSub.id;
      // Backfill only fields that aren't already set — never overwrite
      // something a person entered manually, matching the pattern used
      // when a quote is accepted elsewhere in the app.
      const patch: { trade?: string; qbcc_licence_number?: string; contact_name?: string; contact_phone?: string; contact_email?: string } = {};
      if (!existingSub.trade && subcontractorQuote.trade) patch.trade = subcontractorQuote.trade;
      if (!existingSub.qbcc_licence_number && subcontractorQuote.licence_number) patch.qbcc_licence_number = subcontractorQuote.licence_number;
      if (!existingSub.contact_name && subcontractorQuote.contact_name) patch.contact_name = subcontractorQuote.contact_name;
      if (!existingSub.contact_phone && subcontractorQuote.contact_phone) patch.contact_phone = subcontractorQuote.contact_phone;
      if (!existingSub.contact_email && subcontractorQuote.contact_email) patch.contact_email = subcontractorQuote.contact_email;
      if (Object.keys(patch).length) {
        await supabase.from("subcontractors").update(patch).eq("id", subcontractorId);
      }
    } else {
      const { data: newSub, error: subError } = await supabase
        .from("subcontractors")
        .insert({
          project_id: projectId,
          company_name: companyName,
          trade: subcontractorQuote.trade || null,
          qbcc_licence_number: subcontractorQuote.licence_number || null,
          contact_name: subcontractorQuote.contact_name || null,
          contact_phone: subcontractorQuote.contact_phone || null,
          contact_email: subcontractorQuote.contact_email || null,
        })
        .select("id")
        .single();
      if (!subError && newSub) subcontractorId = newSub.id;
    }
    if (subcontractorId) {
      const lineItems = (subcontractorQuote.line_items ?? []).filter((li) => li.description?.trim());
      const lineItemTotal = lineItems.reduce((sum, li) => sum + (typeof li.amount === "number" ? li.amount : 0), 0);
      // Prefer the document's own stated total; fall back to summing line
      // items only if no total was given but items were.
      const amount =
        typeof subcontractorQuote.amount === "number" ? subcontractorQuote.amount : lineItems.length && lineItemTotal > 0 ? lineItemTotal : null;

      const { data: quoteRow, error } = await supabase
        .from("subcontractor_quotes")
        .insert({
          subcontractor_id: subcontractorId,
          project_id: projectId,
          description: subcontractorQuote.description || `Quote from ${companyName}`,
          amount,
          status: amount !== null ? "received" : "requested",
          received_date: amount !== null ? toDateInput(new Date()) : null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (!error && quoteRow) {
        if (lineItems.length) {
          await supabase.from("subcontractor_quote_items").insert(
            lineItems.map((li, i) => ({
              subcontractor_quote_id: quoteRow.id,
              description: li.description,
              amount: typeof li.amount === "number" ? li.amount : null,
              item_date: li.date || null,
              sort_order: i,
            }))
          );
        }
        recordSummary = `Logged a quote from ${companyName}${amount !== null ? ` for $${amount.toLocaleString()}` : ""}${
          lineItems.length ? ` (${lineItems.length} line item${lineItems.length === 1 ? "" : "s"})` : ""
        }${subcontractorQuote.licence_number ? `, licence ${subcontractorQuote.licence_number}` : ""}.`;
        recordHref = `/projects/${projectId}/subcontractors/${subcontractorId}`;
      }
    }
  } else if (result.record_type === "equipment_hire" && equipmentHire?.items?.length) {
    const companyId = project.company_id;
    const loggedItems: string[] = [];

    for (const item of equipmentHire.items) {
      if (!item.name?.trim()) continue;

      let assetId: string | null = null;
      const { data: existingAsset } = await supabase
        .from("assets")
        .select("id, hire_company, hire_cost_per_day")
        .eq("company_id", companyId)
        .ilike("name", item.name)
        .maybeSingle();

      if (existingAsset) {
        assetId = existingAsset.id;
        const patch: { hire_company?: string; hire_cost_per_day?: number; status: "checked_out" } = { status: "checked_out" };
        if (!existingAsset.hire_company && item.hire_company) patch.hire_company = item.hire_company;
        if (existingAsset.hire_cost_per_day === null && typeof item.cost_per_day === "number") patch.hire_cost_per_day = item.cost_per_day;
        await supabase.from("assets").update(patch).eq("id", assetId);
      } else {
        const { data: newAsset, error: assetError } = await supabase
          .from("assets")
          .insert({
            company_id: companyId,
            name: item.name,
            category: item.category || null,
            ownership: "hired",
            hire_company: item.hire_company || null,
            hire_cost_per_day: typeof item.cost_per_day === "number" ? item.cost_per_day : null,
            status: "checked_out",
            created_by: user.id,
          })
          .select("id")
          .single();
        if (!assetError && newAsset) assetId = newAsset.id;
      }

      if (assetId) {
        const totalCost = typeof item.total_cost === "number" ? item.total_cost : null;
        const { error: checkoutError } = await supabase.from("asset_checkouts").insert({
          asset_id: assetId,
          project_id: projectId,
          checked_out_to: project.name,
          checked_out_date: item.hire_start_date || toDateInput(new Date()),
          due_back_date: item.hire_end_date || null,
          total_cost: totalCost,
          notes: `From "${title}".`,
          created_by: user.id,
        });
        if (!checkoutError) loggedItems.push(totalCost !== null ? `${item.name} ($${totalCost.toLocaleString()})` : item.name);
      }
    }

    if (loggedItems.length) {
      recordSummary = `Logged ${loggedItems.length} hired equipment item${loggedItems.length === 1 ? "" : "s"} on the register — now included in this project's Financials: ${loggedItems.join(", ")}.`;
      recordHref = `/equipment`;
    }
  } else if (result.record_type === "payment_claim" && typeof paymentClaim?.amount_claimed === "number") {
    const amountClaimed = paymentClaim.amount_claimed;
    const { error } = await supabase.from("payment_claims").insert({
      project_id: projectId,
      claim_number: paymentClaim.claim_number || null,
      amount_claimed: amountClaimed,
      due_date: paymentClaim.due_date || addBusinessDays(15),
      schedule_due_date: addBusinessDays(15),
      created_by: user.id,
      status: "submitted",
    });
    if (!error) {
      recordSummary = `Logged a payment claim for $${amountClaimed.toLocaleString()}.`;
      recordHref = `/projects/${projectId}/payment-claims`;
    }
  } else if (result.record_type === "qbcc_notice" && qbccNotice?.description) {
    const description = qbccNotice.description;
    const { data: dtrRow, error } = await supabase
      .from("directions_to_rectify")
      .insert({
        project_id: projectId,
        description,
        due_date: qbccNotice.due_date || addDays(35),
        status: "open",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (!error && dtrRow) {
      recordSummary = `Logged a Direction to Rectify: "${description}".`;
      recordHref = `/projects/${projectId}/directions-to-rectify/${dtrRow.id}`;
    }
  }

  return NextResponse.json({
    title,
    category: result.category,
    recordType: result.record_type,
    summary: [`Filed "${title}" under Documents (${result.category}).`, recordSummary].filter(Boolean).join(" "),
    href: recordHref ?? `/projects/${projectId}/documents`,
  });
}
