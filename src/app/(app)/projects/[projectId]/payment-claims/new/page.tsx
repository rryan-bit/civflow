import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewPaymentClaimForm } from "./new-payment-claim-form";
import { BackLink, PageHeader } from "@/components/ui/page-header";

export default async function NewPaymentClaimPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).single();
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <BackLink href={`/projects/${projectId}/payment-claims`}>Back to Payment Claims</BackLink>
      <div className="mt-3">
        <PageHeader title={`New Payment Claim — ${project.name}`} />
      </div>
      <div className="mt-6">
        <NewPaymentClaimForm projectId={projectId} />
      </div>
    </div>
  );
}
