interface PrintHeaderProps {
  title: string;
}

// Issue #36 - shown only in print output (hidden on screen, where the page's own on-screen <h1>/
// CardTitle already says the same thing in context). A physical printout has none of the app
// around it, so this carries what the screen normally provides for free: which report this is,
// when it was generated, and the same "not compliance advice" disclaimer CLAUDE.md requires be
// visible - currently only shown on the login page on screen, easy to lose entirely on a
// printout unless repeated here.
export function PrintHeader({ title }: PrintHeaderProps) {
  return (
    <div className="hidden print:mb-4 print:block">
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground">
        Compliance Tracker — printed{" "}
        {new Date().toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        A reminder/tracking tool only — not compliance advice. Always verify against the official
        ACRA/IRAS/MOM source.
      </p>
    </div>
  );
}
