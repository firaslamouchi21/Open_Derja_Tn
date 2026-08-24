import { PagePlaceholder } from "@/components/page-placeholder";

export default async function LexiconEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PagePlaceholder
      route={`/lexicon/${id}`}
      title="Lexicon entry"
      description="One concept, every variant and form, example attestations, origin with derivation note."
    />
  );
}
