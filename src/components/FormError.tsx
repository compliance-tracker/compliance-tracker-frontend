interface FormErrorProps {
  children: React.ReactNode;
  className?: string;
}

// Issue #26 (accessibility pass): every form's error message was a plain <p>, with nothing
// telling assistive tech a new error just appeared - a screen reader user submitting a form only
// ever finds out by manually navigating to where the error text landed, if they think to look at
// all. role="alert" (implicit aria-live="assertive" + aria-atomic="true") makes the browser
// announce it the moment it renders, unprompted, same as a sighted user seeing it appear in red.
// Extracted once so every current and future error message gets this for free, rather than
// eleven near-identical <p className="text-destructive"> call sites that could drift.
export function FormError({ children, className }: FormErrorProps) {
  return (
    <p role="alert" className={`text-sm text-destructive ${className ?? ""}`}>
      {children}
    </p>
  );
}
