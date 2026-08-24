import { PagePlaceholder } from "@/components/page-placeholder";

export default async function EntryPermalinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PagePlaceholder
      route={`/s/${id}`}
      title="Entry permalink"
      description="Text, annotations, translations, attestations, source, revision history, cite button, report link."
    />
  );
}
