import { PagePlaceholder } from "@/components/page-placeholder";

export default function TaskInboxPage() {
  return (
    <PagePlaceholder
      route="/tasks"
      title="Task inbox"
      description="Open tasks this person can do. Never shows an empty or locked state — if there's nothing, redirects to /contribute."
    />
  );
}
