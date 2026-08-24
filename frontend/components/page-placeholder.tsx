export function PagePlaceholder({
  route,
  title,
  description,
}: {
  route: string;
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <p className="text-sm text-muted-foreground">{route}</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </main>
  );
}
