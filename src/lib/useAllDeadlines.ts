import { useEffect, useState } from "react";
import { api } from "./api";
import type { Business, Deadline } from "./types";

export interface BusinessDeadline {
  business: Business;
  deadline: Deadline;
}

// Shared by CalendarPage (issue #63) and BrowserNotificationWatcher (issue #34) - both need
// "every business's own deadlines, merged into one list." No backend endpoint returns deadlines
// across every business at once, so this fetches each business's own
// GET /api/businesses/{id}/deadlines individually and merges client-side (fine at this app's
// scale - one SME's own businesses, not a multi-tenant global list). refreshKey lets a caller
// (the watcher, on its own polling interval) force a refetch without needing `businesses` itself
// to have changed - bump it and the effect below re-runs.
export function useAllDeadlines(businesses: Business[], refreshKey = 0) {
  const [allDeadlines, setAllDeadlines] = useState<BusinessDeadline[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (businesses.length === 0) {
      setAllDeadlines([]);
      return;
    }

    setLoading(true);
    Promise.all(
      businesses.map((business) =>
        api.getDeadlines(business.id).then((deadlines) => deadlines.map((deadline) => ({ business, deadline }))),
      ),
    )
      .then((perBusiness) => setAllDeadlines(perBusiness.flat()))
      .finally(() => setLoading(false));
  }, [businesses, refreshKey]);

  return { allDeadlines, loading };
}
