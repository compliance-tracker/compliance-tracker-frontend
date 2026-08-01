import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AccountPage } from "@/components/account/AccountPage";
import { BusinessDetailPage } from "@/components/business/BusinessDetailPage";
import { BusinessesPage } from "@/components/business/BusinessesPage";
import { CalendarPage } from "@/components/calendar/CalendarPage";
import { EditBusinessPage } from "@/components/business/EditBusinessPage";
import { LoginForm } from "@/components/auth/LoginForm";
import { NotFoundPage } from "@/components/shell/NotFoundPage";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import { Shell } from "@/components/shell/Shell";
import { api, registerSessionExpiredHandler } from "@/lib/api";
import { auth } from "@/lib/auth";
import { toast } from "sonner";
import type { Business } from "@/lib/types";

function App() {
  // Starting state reads whatever token is already in localStorage - so a page refresh
  // doesn't bounce a logged-in user back to the login screen.
  const [isAuthenticated, setIsAuthenticated] = useState(() => auth.getToken() !== null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when a request comes back 401 and a silent refresh (backend issue #26) fails too - shown
  // on the login screen so the redirect there is explained, not just an unexplained jump back
  // mid-session (issue #17).
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  // api.ts's request() calls this from wherever a 401 turns up - any authenticated call, not
  // just the initial business list fetch - once refreshing the access token has already failed
  // too. Registered once; api.ts holds a plain module-level reference rather than this app
  // reaching for a full auth context/provider for something used in exactly one place.
  useEffect(() => {
    registerSessionExpiredHandler(() => {
      setIsAuthenticated(false);
      setSessionMessage("Your session expired. Please log in again.");
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    api
      .getBusinesses()
      .then(setBusinesses)
      .catch((err: Error) => {
        // A 401 here already went through request()'s own refresh-then-give-up handling, which
        // already cleared the token and set the session-expired message above - nothing further
        // to do for that case. Anything else (network error, backend down) is a different,
        // separately-shown problem.
        if (!err.message.includes("401")) {
          setError("Could not reach the backend. Is it running on port 8081?");
        }
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  function handleCreated(business: Business) {
    setBusinesses((prev) => [...prev, business]);
  }

  function handleUpdated(business: Business) {
    setBusinesses((prev) => prev.map((b) => (b.id === business.id ? business : b)));
  }

  function handleDeleted(businessId: number) {
    setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
  }

  async function handleLogout() {
    // Best-effort: tell the server to revoke the token (issue #41) so it can't be reused if
    // it ever leaked. Still clear local state even if this fails (backend unreachable, token
    // already expired, etc.) - a logout button should never leave the user stuck "logged in"
    // just because the server call didn't go through.
    try {
      await api.logout();
    } catch {
      // ignored - see above
    }

    auth.clearToken();
    setIsAuthenticated(false);
    setBusinesses([]);
    setSessionMessage(null);
    toast.success("Logged out");
  }

  if (!isAuthenticated) {
    return (
      <LoginForm
        onAuthenticated={() => {
          setIsAuthenticated(true);
          setSessionMessage(null);
        }}
        message={sessionMessage}
      />
    );
  }

  const shellContext = {
    businesses,
    loading,
    error,
    onCreated: handleCreated,
    onUpdated: handleUpdated,
    onDeleted: handleDeleted,
    onLogout: handleLogout,
  };

  return (
    <Routes>
      <Route element={<Shell context={shellContext} />}>
        <Route index element={<Navigate to="/businesses" replace />} />
        <Route path="businesses" element={<BusinessesPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="businesses/:id" element={<BusinessDetailPage />} />
        <Route path="businesses/:id/edit" element={<EditBusinessPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
