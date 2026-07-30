import { useOutletContext } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/auth";
import type { ShellContext } from "@/components/shell/Shell";

// The Account page (issue #67) - registered email (read-only, decoded from the JWT already
// held in localStorage rather than a new "get current user" API call), a disabled "Change
// password" control (no backend endpoint for this exists yet, shown honestly as "Coming soon"
// rather than implying it works), and Log out - its real designed home, moved off the nav
// rail's temporary bottom-pinned placeholder (see NavRail.tsx, added in #61 specifically as a
// stopgap until this page existed).
export function AccountPage() {
  const { onLogout } = useOutletContext<ShellContext>();
  const email = auth.getEmail();

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">Your login details.</p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="account-email">Email</Label>
            <Input id="account-email" value={email ?? ""} disabled />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-password">Password</Label>
            <div className="flex items-center gap-2.5">
              <Input id="account-password" value="••••••••" disabled className="flex-1" />
              <Button variant="outline" size="sm" disabled className="shrink-0">
                Change
                <Badge variant="secondary" className="ml-1.5">
                  Coming soon
                </Badge>
              </Button>
            </div>
          </div>

          <Button variant="outline" onClick={onLogout}>
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
