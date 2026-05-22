import type { UserRole } from "../auth/auth.interface.js";

export type IssueType = "bug" | "feature_request";
export type IssueStatus = "open" | "in_progress" | "resolved";

export type IssueRow = {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
};

export type Reporter = {
  id: number;
  name: string;
  role: UserRole;
};

export type IssueWithReporter = Omit<IssueRow, "reporter_id"> & {
  reporter: Reporter | null;
};

export type CreateIssuePayload = {
  title: string;
  description: string;
  type: IssueType;
};

export type UpdateIssuePayload = Partial<CreateIssuePayload> & {
  status?: IssueStatus;
};

export type IssueQuery = {
  sort?: string;
  type?: string;
  status?: string;
};
