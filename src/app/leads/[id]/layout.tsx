import LeadPipelineState from "@/components/lead-pipeline-state";

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
      {children}
    </>
  );
}
