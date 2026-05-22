import { StatusCodes } from "http-status-codes";
import { pool } from "../../db/index.js";
import { AppError } from "../../utils/AppError.js";
import { assertRequiredString } from "../../utils/validation.js";
import type { UserRole } from "../auth/auth.interface.js";
import type {
  CreateIssuePayload,
  IssueQuery,
  IssueRow,
  IssueStatus,
  IssueType,
  IssueWithReporter,
  Reporter,
  UpdateIssuePayload,
} from "./issue.interface.js";

const issueTypes: IssueType[] = ["bug", "feature_request"];
const issueStatuses: IssueStatus[] = ["open", "in_progress", "resolved"];

const validateIssueType = (type: unknown): IssueType => {
  if (type !== "bug" && type !== "feature_request") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Type must be bug or feature_request");
  }

  return type;
};

const validateIssueStatus = (status: unknown): IssueStatus => {
  if (status !== "open" && status !== "in_progress" && status !== "resolved") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Status must be open, in_progress, or resolved");
  }

  return status;
};

const validateTitle = (title: unknown): string => {
  const cleanTitle = assertRequiredString(title, "Title");

  if (cleanTitle.length > 150) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Title must be 150 characters or fewer");
  }

  return cleanTitle;
};

const validateDescription = (description: unknown): string => {
  const cleanDescription = assertRequiredString(description, "Description");

  if (cleanDescription.length < 20) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Description must be at least 20 characters long");
  }

  return cleanDescription;
};

const getReporterMap = async (reporterIds: number[]): Promise<Map<number, Reporter>> => {
  const uniqueReporterIds = [...new Set(reporterIds)];

  if (uniqueReporterIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<Reporter>(
    "SELECT id, name, role FROM users WHERE id = ANY($1::int[])",
    [uniqueReporterIds],
  );

  return new Map(result.rows.map((reporter) => [reporter.id, reporter]));
};

const attachReporters = async (issues: IssueRow[]): Promise<IssueWithReporter[]> => {
  const reporterMap = await getReporterMap(issues.map((issue) => issue.reporter_id));

  return issues.map((issue) => {
    const { reporter_id: reporterId, ...issueData } = issue;

    return {
      ...issueData,
      reporter: reporterMap.get(reporterId) ?? null,
    };
  });
};

const createIssue = async (payload: CreateIssuePayload, reporterId: number): Promise<IssueRow> => {
  const title = validateTitle(payload.title);
  const description = validateDescription(payload.description);
  const type = validateIssueType(payload.type);

  const reporter = await pool.query("SELECT id FROM users WHERE id = $1", [reporterId]);

  if ((reporter.rowCount ?? 0) === 0) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authenticated user no longer exists");
  }

  const result = await pool.query<IssueRow>(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description, type, reporterId],
  );

  const issue = result.rows[0];

  if (!issue) {
    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Issue creation failed");
  }

  return issue;
};

const getAllIssues = async (query: IssueQuery): Promise<IssueWithReporter[]> => {
  const filters: string[] = [];
  const values: string[] = [];

  if (query.type) {
    if (!issueTypes.includes(query.type as IssueType)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid type filter");
    }

    values.push(query.type);
    filters.push(`type = $${values.length}`);
  }

  if (query.status) {
    if (!issueStatuses.includes(query.status as IssueStatus)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid status filter");
    }

    values.push(query.status);
    filters.push(`status = $${values.length}`);
  }

  const sort = query.sort ?? "newest";

  if (sort !== "newest" && sort !== "oldest") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Sort must be newest or oldest");
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
  const orderDirection = sort === "oldest" ? "ASC" : "DESC";
  const result = await pool.query<IssueRow>(
    `SELECT * FROM issues ${whereClause} ORDER BY created_at ${orderDirection}`,
    values,
  );

  return attachReporters(result.rows);
};

const getSingleIssue = async (id: string): Promise<IssueWithReporter> => {
  const result = await pool.query<IssueRow>("SELECT * FROM issues WHERE id = $1", [id]);
  const issue = result.rows[0];

  if (!issue) {
    throw new AppError(StatusCodes.NOT_FOUND, "Issue not found");
  }

  const issues = await attachReporters([issue]);
  const issueWithReporter = issues[0];

  if (!issueWithReporter) {
    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Issue lookup failed");
  }

  return issueWithReporter;
};

const updateIssue = async (
  id: string,
  payload: UpdateIssuePayload,
  requester: { id: number; role: UserRole },
): Promise<IssueRow> => {
  const existingResult = await pool.query<IssueRow>("SELECT * FROM issues WHERE id = $1", [id]);
  const existingIssue = existingResult.rows[0];

  if (!existingIssue) {
    throw new AppError(StatusCodes.NOT_FOUND, "Issue not found");
  }

  const isMaintainer = requester.role === "maintainer";
  const isOwnOpenIssue = existingIssue.reporter_id === requester.id && existingIssue.status === "open";

  if (!isMaintainer && !isOwnOpenIssue) {
    throw new AppError(StatusCodes.FORBIDDEN, "You can only update your own open issues");
  }

  const updates: string[] = [];
  const values: string[] = [];

  if (payload.title !== undefined) {
    values.push(validateTitle(payload.title));
    updates.push(`title = $${values.length}`);
  }

  if (payload.description !== undefined) {
    values.push(validateDescription(payload.description));
    updates.push(`description = $${values.length}`);
  }

  if (payload.type !== undefined) {
    values.push(validateIssueType(payload.type));
    updates.push(`type = $${values.length}`);
  }

  if (payload.status !== undefined) {
    if (!isMaintainer) {
      throw new AppError(StatusCodes.FORBIDDEN, "Only maintainers can update issue status");
    }

    values.push(validateIssueStatus(payload.status));
    updates.push(`status = $${values.length}`);
  }

  if (updates.length === 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "At least one issue field is required");
  }

  values.push(id);
  const result = await pool.query<IssueRow>(
    `UPDATE issues SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values,
  );
  const updatedIssue = result.rows[0];

  if (!updatedIssue) {
    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Issue update failed");
  }

  return updatedIssue;
};

const deleteIssue = async (id: string): Promise<void> => {
  const result = await pool.query("DELETE FROM issues WHERE id = $1", [id]);

  if ((result.rowCount ?? 0) === 0) {
    throw new AppError(StatusCodes.NOT_FOUND, "Issue not found");
  }
};

export const issueService = {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
  deleteIssue,
};
