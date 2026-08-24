import { PagePlaceholder } from "@/components/page-placeholder";

export default async function ProposeCorrectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PagePlaceholder
      route={`/s/${id}/correct`}
      title="Propose correction"
      description="Suggest a fix without write access."
    />
  );
}
