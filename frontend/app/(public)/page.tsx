import Link from "next/link";

const ROUTES = [
  { section: "Public", links: [
    ["/translate", "Translate"],
    ["/explore", "Explore"],
    ["/compare", "Compare"],
    ["/s/example-id", "Entry permalink"],
    ["/s/example-id/correct", "Propose correction"],
    ["/lexicon", "Lexicon"],
    ["/lexicon/example-id", "Lexicon entry"],
    ["/origins", "Origins"],
    ["/research", "Research"],
    ["/data", "Download"],
    ["/methodology", "Methodology"],
    ["/coverage", "Coverage"],
    ["/style", "Style guide"],
    ["/cite", "Citation"],
    ["/license", "Licence"],
    ["/gaps", "Gaps"],
    ["/contributors", "Leaderboard"],
    ["/support", "Support"],
  ]},
  { section: "Contribute", links: [
    ["/contribute", "Contribute"],
    ["/confirm", "Confirm"],
    ["/tasks", "Task inbox"],
    ["/tasks/translate", "Translate task"],
    ["/tasks/transliterate", "Transliterate task"],
    ["/me", "My contributions"],
  ]},
  { section: "Review", links: [
    ["/review", "Review queue"],
    ["/review/lemma", "Lemma linking"],
    ["/review/adjudicate", "Adjudication"],
    ["/review/corrections", "Corrections"],
    ["/review/standardise", "Standardisation"],
  ]},
  { section: "Admin", links: [
    ["/admin", "Admin dashboard"],
  ]},
] as const;

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <p className="text-sm text-muted-foreground">/</p>
      <h1 className="text-2xl font-semibold">OpenDerja_TN</h1>
      <p className="mt-2 text-muted-foreground">
        An open, regionally balanced written corpus of Tunisian Derja. This landing page is a
        bare-bones route index for manually clicking through every page.
      </p>

      {ROUTES.map(({ section, links }) => (
        <section key={section} className="mt-6">
          <h2 className="text-lg font-medium">{section}</h2>
          <ul className="mt-2 space-y-1">
            {links.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-primary underline">
                  {label}
                </Link>
                <span className="ms-2 text-sm text-muted-foreground">{href}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
