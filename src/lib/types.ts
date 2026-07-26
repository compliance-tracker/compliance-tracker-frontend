// Mirrors com.chrainx.compliance_tracker.Business (backend) - field names must match exactly
// since they're just JSON, no transformation layer between the two.
export interface Business {
  id: number;
  name: string;
  financialYearEnd: string; // ISO date, e.g. "2026-12-31"
  gstRegistered: boolean;
}

export type NewBusiness = Omit<Business, "id">;

// Mirrors com.chrainx.compliance_tracker.rules.Deadline
export type ObligationType = "ACRA_ANNUAL_RETURN" | "GST_F5" | "WORK_PASS_RENEWAL";

export interface Deadline {
  obligationType: ObligationType;
  dueDate: string;
}

// Mirrors com.chrainx.compliance_tracker.AuthRequest / AuthResponse
export interface Credentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

// Mirrors com.chrainx.compliance_tracker.WorkPass (backend) - "business" is @JsonIgnore'd
// server-side (the caller already knows the business id from the URL), so it never appears here.
export interface WorkPass {
  id: number;
  employeeName: string;
  expiryDate: string; // ISO date, e.g. "2026-11-01"
}

export type NewWorkPass = Omit<WorkPass, "id">;
