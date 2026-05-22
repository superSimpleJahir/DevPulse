import { StatusCodes } from "http-status-codes";
import { AppError } from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import type { IssueQuery } from "./issue.interface.js";
import { issueService } from "./issue.service.js";

const getRouteId = (id: unknown): string => {
  if (typeof id !== "string") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Issue id is required");
  }

  return id;
};

const createIssue = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const result = await issueService.createIssue(req.body, req.user.id);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    message: "Issue created successfully",
    data: result,
  });
});

const getAllIssues = catchAsync(async (req, res) => {
  const query: IssueQuery = {};

  if (typeof req.query.sort === "string") {
    query.sort = req.query.sort;
  }

  if (typeof req.query.type === "string") {
    query.type = req.query.type;
  }

  if (typeof req.query.status === "string") {
    query.status = req.query.status;
  }

  const result = await issueService.getAllIssues(query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    data: result,
  });
});

const getSingleIssue = catchAsync(async (req, res) => {
  const result = await issueService.getSingleIssue(getRouteId(req.params.id));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    data: result,
  });
});

const updateIssue = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication required");
  }

  const result = await issueService.updateIssue(getRouteId(req.params.id), req.body, {
    id: req.user.id,
    role: req.user.role,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Issue updated successfully",
    data: result,
  });
});

const deleteIssue = catchAsync(async (req, res) => {
  await issueService.deleteIssue(getRouteId(req.params.id));

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Issue deleted successfully",
  });
});

export const issueController = {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
  deleteIssue,
};
