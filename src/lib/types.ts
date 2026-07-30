// Mirrors com.chrainx.compliance_tracker.Business (backend) - field names must match exactly
// since they're just JSON, no transformation layer between the two.
export interface Business {
  id: number;
  name: string;
  financialYearEnd: string; // ISO date, e.g. "2026-12-31"
  gstRegistered: boolean;
  leadTimeDays: number; // backend issue #53 - how many days ahead of a deadline to remind, 1-90
  // backend issue #31 - optional, only meaningful/validated at creation (a first financial year
  // can't run more than 18 months past incorporation, Companies Act 1967 s.198). null when never
  // set - most businesses using this app already have a normal, non-first financial year.
  incorporationDate: string | null;
}

// Mirrors com.chrainx.compliance_tracker.ApiError (backend issue #47) - every non-2xx response
// from a business/auth endpoint returns this shape instead of an empty body or a framework
// default.
export interface ApiError {
  error: string;
  message: string;
}

export type NewBusiness = Omit<Business, "id">;

// Mirrors com.chrainx.compliance_tracker.rules.Deadline. "CUSTOM" added for backend issue #59.
export type ObligationType = "ACRA_ANNUAL_RETURN" | "GST_F5" | "WORK_PASS_RENEWAL" | "CUSTOM";

// customName/customObligationId are only ever set together, only for obligationType "CUSTOM" -
// both null/absent for the 3 built-in types, which already have a fixed label (OBLIGATION_LABELS
// in urgency.ts) and don't need per-deadline identification the way two different custom
// obligations sharing a due date do (backend's own dedupe reasoning, Deadline.java).
export interface Deadline {
  obligationType: ObligationType;
  dueDate: string;
  customName?: string;
  customObligationId?: number;
}

// Mirrors com.chrainx.compliance_tracker.AuthRequest / AuthResponse
export interface Credentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
}

// Mirrors com.chrainx.compliance_tracker.auth.RegistrationResponse (backend issue #120) -
// register no longer returns usable tokens at all, since an unverified account can't log in
// anyway (login now requires emailVerified) - just a human-readable "what to do next" message.
export interface RegistrationResponse {
  message: string;
}

// Mirrors com.chrainx.compliance_tracker.WorkPass (backend) - "business" is @JsonIgnore'd
// server-side (the caller already knows the business id from the URL), so it never appears here.
export interface WorkPass {
  id: number;
  employeeName: string;
  expiryDate: string; // ISO date, e.g. "2026-11-01"
}

export type NewWorkPass = Omit<WorkPass, "id">;

// Mirrors com.chrainx.compliance_tracker.business.CustomObligationResponse (backend issue #59) -
// a business's own user-defined compliance items beyond the 3 built-in ones. dueDate here is the
// stored anchor, not the live-recomputed next occurrence for a recurring obligation - the actual
// upcoming date only ever shows up via GET .../deadlines (see Deadline above), same relationship
// Business.financialYearEnd has to the real ACRA deadline. recurrenceMonths null means a one-off
// obligation the user re-edits themselves once handled; a number means it recurs every N months.
export interface CustomObligation {
  id: number;
  name: string;
  dueDate: string;
  recurrenceMonths: number | null;
}

export type NewCustomObligation = Omit<CustomObligation, "id">;

// Mirrors com.chrainx.compliance_tracker.business.PageResponse (backend issue #49) - both
// GET /api/businesses and GET /api/businesses/{id}/work-passes now return this envelope instead
// of a bare array. Only .content is actually used right now (api.ts unwraps it immediately) -
// the rest of the fields exist for a future real pagination UI (page navigation, "N of M"), not
// built yet since the backend's default page size (20) already covers realistic current usage.
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// Mirrors com.chrainx.compliance_tracker.notifications.NotificationStatusResponse (backend issue
// #114) - fromAddress is only present when channel is "email" (the backend's @JsonInclude.NON_NULL
// omits it entirely for "logging", not sends null).
export interface NotificationStatus {
  channel: "logging" | "email";
  fromAddress?: string;
}
