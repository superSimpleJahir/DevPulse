import { createRequire } from "module"; const require = createRequire(import.meta.url);

// src/app.ts
import cors from "cors";
import express from "express";
import { StatusCodes as StatusCodes9 } from "http-status-codes";

// src/middleware/errorHandler.ts
import { StatusCodes } from "http-status-codes";

// src/utils/AppError.ts
var AppError = class extends Error {
  statusCode;
  errors;
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
};

// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var requiredEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};
var config = {
  port: Number(process.env.PORT) || 5e3,
  databaseUrl: requiredEnv("DATABASE_URL"),
  jwtSecret: requiredEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  nodeEnv: process.env.NODE_ENV || "development"
};
var config_default = config;

// src/middleware/errorHandler.ts
var errorHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;
  const message = error instanceof Error ? error.message : "Something went wrong";
  const errors = error instanceof AppError ? error.errors : void 0;
  if (config_default.nodeEnv !== "test") {
    console.error(error);
  }
  res.status(statusCode).json({
    success: false,
    message,
    ...errors !== void 0 ? { errors } : {}
  });
};

// src/middleware/notFound.ts
import { StatusCodes as StatusCodes2 } from "http-status-codes";
var notFound = (req, res) => {
  res.status(StatusCodes2.NOT_FOUND).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

// src/routes/index.ts
import { Router as Router3 } from "express";

// src/modules/auth/auth.route.ts
import { Router } from "express";

// src/modules/auth/auth.controller.ts
import { StatusCodes as StatusCodes5 } from "http-status-codes";

// src/utils/catchAsync.ts
var catchAsync = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// src/utils/sendResponse.ts
var sendResponse = (res, payload) => {
  const responseBody = {
    success: true
  };
  if (payload.message) {
    responseBody.message = payload.message;
  }
  if (payload.data !== void 0) {
    responseBody.data = payload.data;
  }
  res.status(payload.statusCode).json(responseBody);
};

// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { StatusCodes as StatusCodes4 } from "http-status-codes";

// src/db/index.ts
import { Pool } from "pg";
var pool = new Pool({
  connectionString: config_default.databaseUrl
});
var initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'contributor' CHECK (role IN ('contributor', 'maintainer')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS issues (
      id SERIAL PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      description TEXT NOT NULL CHECK (char_length(description) >= 20),
      type VARCHAR(30) NOT NULL CHECK (type IN ('bug', 'feature_request')),
      status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
      reporter_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'users_set_updated_at'
      ) THEN
        CREATE TRIGGER users_set_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'issues_set_updated_at'
      ) THEN
        CREATE TRIGGER issues_set_updated_at
        BEFORE UPDATE ON issues
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
      END IF;
    END $$;
  `);
};

// src/utils/validation.ts
import { StatusCodes as StatusCodes3 } from "http-status-codes";
var isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
var assertRequiredString = (value, fieldName) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(StatusCodes3.BAD_REQUEST, `${fieldName} is required`);
  }
  return value.trim();
};

// src/modules/auth/auth.service.ts
var sanitizeUser = (user) => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};
var validateRole = (role) => {
  if (role === void 0) {
    return "contributor";
  }
  if (role !== "contributor" && role !== "maintainer") {
    throw new AppError(StatusCodes4.BAD_REQUEST, "Role must be contributor or maintainer");
  }
  return role;
};
var signup = async (payload) => {
  const name = assertRequiredString(payload.name, "Name");
  const email = assertRequiredString(payload.email, "Email").toLowerCase();
  const password = assertRequiredString(payload.password, "Password");
  const role = validateRole(payload.role);
  if (!isValidEmail(email)) {
    throw new AppError(StatusCodes4.BAD_REQUEST, "Email must be valid");
  }
  if (password.length < 6) {
    throw new AppError(StatusCodes4.BAD_REQUEST, "Password must be at least 6 characters long");
  }
  const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if ((existingUser.rowCount ?? 0) > 0) {
    throw new AppError(StatusCodes4.BAD_REQUEST, "User with this email already exists");
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, password, role, created_at, updated_at`,
    [name, email, hashedPassword, role]
  );
  const user = result.rows[0];
  if (!user) {
    throw new AppError(StatusCodes4.INTERNAL_SERVER_ERROR, "User registration failed");
  }
  return sanitizeUser(user);
};
var login = async (payload) => {
  const email = assertRequiredString(payload.email, "Email").toLowerCase();
  const password = assertRequiredString(payload.password, "Password");
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user) {
    throw new AppError(StatusCodes4.UNAUTHORIZED, "Invalid email or password");
  }
  const passwordMatched = await bcrypt.compare(password, user.password);
  if (!passwordMatched) {
    throw new AppError(StatusCodes4.UNAUTHORIZED, "Invalid email or password");
  }
  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      role: user.role
    },
    config_default.jwtSecret,
    {
      expiresIn: config_default.jwtExpiresIn
    }
  );
  return {
    token,
    user: sanitizeUser(user)
  };
};
var authService = {
  signup,
  login
};

// src/modules/auth/auth.controller.ts
var signup2 = catchAsync(async (req, res) => {
  const result = await authService.signup(req.body);
  sendResponse(res, {
    statusCode: StatusCodes5.CREATED,
    message: "User registered successfully",
    data: result
  });
});
var login2 = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  sendResponse(res, {
    statusCode: StatusCodes5.OK,
    message: "Login successful",
    data: result
  });
});
var authController = {
  signup: signup2,
  login: login2
};

// src/modules/auth/auth.route.ts
var router = Router();
router.post("/signup", authController.signup);
router.post("/login", authController.login);
var authRoute = router;

// src/modules/issues/issue.route.ts
import { Router as Router2 } from "express";

// src/middleware/auth.ts
import jwt2 from "jsonwebtoken";
import { StatusCodes as StatusCodes6 } from "http-status-codes";
var isTokenPayload = (payload) => {
  if (typeof payload === "string") {
    return false;
  }
  return typeof payload.id === "number" && typeof payload.name === "string" && (payload.role === "contributor" || payload.role === "maintainer");
};
var requireAuth = (req, _res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    throw new AppError(StatusCodes6.UNAUTHORIZED, "Authorization token is required");
  }
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : authorization;
  try {
    const decoded = jwt2.verify(token, config_default.jwtSecret);
    if (!isTokenPayload(decoded)) {
      throw new AppError(StatusCodes6.UNAUTHORIZED, "Invalid token payload");
    }
    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(StatusCodes6.UNAUTHORIZED, "Invalid or expired token");
  }
};
var requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) {
    throw new AppError(StatusCodes6.UNAUTHORIZED, "Authentication required");
  }
  if (!roles.includes(req.user.role)) {
    throw new AppError(StatusCodes6.FORBIDDEN, "You do not have permission to perform this action");
  }
  next();
};

// src/modules/issues/issue.controller.ts
import { StatusCodes as StatusCodes8 } from "http-status-codes";

// src/modules/issues/issue.service.ts
import { StatusCodes as StatusCodes7 } from "http-status-codes";
var issueTypes = ["bug", "feature_request"];
var issueStatuses = ["open", "in_progress", "resolved"];
var validateIssueType = (type) => {
  if (type !== "bug" && type !== "feature_request") {
    throw new AppError(StatusCodes7.BAD_REQUEST, "Type must be bug or feature_request");
  }
  return type;
};
var validateIssueStatus = (status) => {
  if (status !== "open" && status !== "in_progress" && status !== "resolved") {
    throw new AppError(StatusCodes7.BAD_REQUEST, "Status must be open, in_progress, or resolved");
  }
  return status;
};
var validateTitle = (title) => {
  const cleanTitle = assertRequiredString(title, "Title");
  if (cleanTitle.length > 150) {
    throw new AppError(StatusCodes7.BAD_REQUEST, "Title must be 150 characters or fewer");
  }
  return cleanTitle;
};
var validateDescription = (description) => {
  const cleanDescription = assertRequiredString(description, "Description");
  if (cleanDescription.length < 20) {
    throw new AppError(StatusCodes7.BAD_REQUEST, "Description must be at least 20 characters long");
  }
  return cleanDescription;
};
var getReporterMap = async (reporterIds) => {
  const uniqueReporterIds = [...new Set(reporterIds)];
  if (uniqueReporterIds.length === 0) {
    return /* @__PURE__ */ new Map();
  }
  const result = await pool.query(
    "SELECT id, name, role FROM users WHERE id = ANY($1::int[])",
    [uniqueReporterIds]
  );
  return new Map(result.rows.map((reporter) => [reporter.id, reporter]));
};
var attachReporters = async (issues) => {
  const reporterMap = await getReporterMap(issues.map((issue) => issue.reporter_id));
  return issues.map((issue) => {
    const { reporter_id: reporterId, ...issueData } = issue;
    return {
      ...issueData,
      reporter: reporterMap.get(reporterId) ?? null
    };
  });
};
var createIssue = async (payload, reporterId) => {
  const title = validateTitle(payload.title);
  const description = validateDescription(payload.description);
  const type = validateIssueType(payload.type);
  const reporter = await pool.query("SELECT id FROM users WHERE id = $1", [reporterId]);
  if ((reporter.rowCount ?? 0) === 0) {
    throw new AppError(StatusCodes7.UNAUTHORIZED, "Authenticated user no longer exists");
  }
  const result = await pool.query(
    `INSERT INTO issues (title, description, type, reporter_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [title, description, type, reporterId]
  );
  const issue = result.rows[0];
  if (!issue) {
    throw new AppError(StatusCodes7.INTERNAL_SERVER_ERROR, "Issue creation failed");
  }
  return issue;
};
var getAllIssues = async (query) => {
  const filters = [];
  const values = [];
  if (query.type) {
    if (!issueTypes.includes(query.type)) {
      throw new AppError(StatusCodes7.BAD_REQUEST, "Invalid type filter");
    }
    values.push(query.type);
    filters.push(`type = $${values.length}`);
  }
  if (query.status) {
    if (!issueStatuses.includes(query.status)) {
      throw new AppError(StatusCodes7.BAD_REQUEST, "Invalid status filter");
    }
    values.push(query.status);
    filters.push(`status = $${values.length}`);
  }
  const sort = query.sort ?? "newest";
  if (sort !== "newest" && sort !== "oldest") {
    throw new AppError(StatusCodes7.BAD_REQUEST, "Sort must be newest or oldest");
  }
  const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
  const orderDirection = sort === "oldest" ? "ASC" : "DESC";
  const result = await pool.query(
    `SELECT * FROM issues ${whereClause} ORDER BY created_at ${orderDirection}`,
    values
  );
  return attachReporters(result.rows);
};
var getSingleIssue = async (id) => {
  const result = await pool.query("SELECT * FROM issues WHERE id = $1", [id]);
  const issue = result.rows[0];
  if (!issue) {
    throw new AppError(StatusCodes7.NOT_FOUND, "Issue not found");
  }
  const issues = await attachReporters([issue]);
  const issueWithReporter = issues[0];
  if (!issueWithReporter) {
    throw new AppError(StatusCodes7.INTERNAL_SERVER_ERROR, "Issue lookup failed");
  }
  return issueWithReporter;
};
var updateIssue = async (id, payload, requester) => {
  const existingResult = await pool.query("SELECT * FROM issues WHERE id = $1", [id]);
  const existingIssue = existingResult.rows[0];
  if (!existingIssue) {
    throw new AppError(StatusCodes7.NOT_FOUND, "Issue not found");
  }
  const isMaintainer = requester.role === "maintainer";
  const isOwnOpenIssue = existingIssue.reporter_id === requester.id && existingIssue.status === "open";
  if (!isMaintainer && !isOwnOpenIssue) {
    throw new AppError(StatusCodes7.FORBIDDEN, "You can only update your own open issues");
  }
  const updates = [];
  const values = [];
  if (payload.title !== void 0) {
    values.push(validateTitle(payload.title));
    updates.push(`title = $${values.length}`);
  }
  if (payload.description !== void 0) {
    values.push(validateDescription(payload.description));
    updates.push(`description = $${values.length}`);
  }
  if (payload.type !== void 0) {
    values.push(validateIssueType(payload.type));
    updates.push(`type = $${values.length}`);
  }
  if (payload.status !== void 0) {
    if (!isMaintainer) {
      throw new AppError(StatusCodes7.FORBIDDEN, "Only maintainers can update issue status");
    }
    values.push(validateIssueStatus(payload.status));
    updates.push(`status = $${values.length}`);
  }
  if (updates.length === 0) {
    throw new AppError(StatusCodes7.BAD_REQUEST, "At least one issue field is required");
  }
  values.push(id);
  const result = await pool.query(
    `UPDATE issues SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`,
    values
  );
  const updatedIssue = result.rows[0];
  if (!updatedIssue) {
    throw new AppError(StatusCodes7.INTERNAL_SERVER_ERROR, "Issue update failed");
  }
  return updatedIssue;
};
var deleteIssue = async (id) => {
  const result = await pool.query("DELETE FROM issues WHERE id = $1", [id]);
  if ((result.rowCount ?? 0) === 0) {
    throw new AppError(StatusCodes7.NOT_FOUND, "Issue not found");
  }
};
var issueService = {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
  deleteIssue
};

// src/modules/issues/issue.controller.ts
var getRouteId = (id) => {
  if (typeof id !== "string") {
    throw new AppError(StatusCodes8.BAD_REQUEST, "Issue id is required");
  }
  return id;
};
var createIssue2 = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError(StatusCodes8.UNAUTHORIZED, "Authentication required");
  }
  const result = await issueService.createIssue(req.body, req.user.id);
  sendResponse(res, {
    statusCode: StatusCodes8.CREATED,
    message: "Issue created successfully",
    data: result
  });
});
var getAllIssues2 = catchAsync(async (req, res) => {
  const query = {};
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
    statusCode: StatusCodes8.OK,
    data: result
  });
});
var getSingleIssue2 = catchAsync(async (req, res) => {
  const result = await issueService.getSingleIssue(getRouteId(req.params.id));
  sendResponse(res, {
    statusCode: StatusCodes8.OK,
    data: result
  });
});
var updateIssue2 = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new AppError(StatusCodes8.UNAUTHORIZED, "Authentication required");
  }
  const result = await issueService.updateIssue(getRouteId(req.params.id), req.body, {
    id: req.user.id,
    role: req.user.role
  });
  sendResponse(res, {
    statusCode: StatusCodes8.OK,
    message: "Issue updated successfully",
    data: result
  });
});
var deleteIssue2 = catchAsync(async (req, res) => {
  await issueService.deleteIssue(getRouteId(req.params.id));
  sendResponse(res, {
    statusCode: StatusCodes8.OK,
    message: "Issue deleted successfully"
  });
});
var issueController = {
  createIssue: createIssue2,
  getAllIssues: getAllIssues2,
  getSingleIssue: getSingleIssue2,
  updateIssue: updateIssue2,
  deleteIssue: deleteIssue2
};

// src/modules/issues/issue.route.ts
var router2 = Router2();
router2.post("/", requireAuth, issueController.createIssue);
router2.get("/", issueController.getAllIssues);
router2.get("/:id", issueController.getSingleIssue);
router2.patch("/:id", requireAuth, issueController.updateIssue);
router2.delete("/:id", requireAuth, requireRole("maintainer"), issueController.deleteIssue);
var issueRoute = router2;

// src/routes/index.ts
var router3 = Router3();
router3.use("/auth", authRoute);
router3.use("/issues", issueRoute);
var routes = router3;

// src/app.ts
var app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (_req, res) => {
  res.status(StatusCodes9.OK).json({
    success: true,
    message: "DevPulse API is running"
  });
});
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);
var app_default = app;

// src/server.ts
var main = async () => {
  try {
    await initDb();
    app_default.listen(config_default.port, () => {
      console.log(`DevPulse API listening on port ${config_default.port}`);
    });
  } catch (error) {
    console.error("Failed to start DevPulse API", error);
    await pool.end();
    process.exit(1);
  }
};
void main();
//# sourceMappingURL=server.js.map