import LeadPipelineState from "@/components/lead-pipeline-state";
import LeadOutreachDraftControls from "@/components/lead-outreach-draft-controls";

export default async function LeadDetailLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  return (
    <>
      <LeadPipelineState leadId={id} />
      <LeadOutreachDraftControls leadId={id} />
      {children}
    </>
  );
}
