import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center px-5 py-[70px] text-center">
      <div className="font-serif text-[56px] leading-none font-bold tracking-tight text-primary">404</div>
      <h1 className="mt-2.5 mb-1.5 text-lg font-semibold">Page not found</h1>
      <p className="mb-5 max-w-[36ch] text-sm text-muted-foreground">
        The page you're looking for doesn't exist, or may have moved.
      </p>
      <Button asChild>
        <Link to="/businesses">Back to businesses</Link>
      </Button>
    </div>
  );
}
