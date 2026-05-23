import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./app.js";
import { initDb } from "./db/index.js";

let dbReady: Promise<void> | null = null;

const ensureDbReady = (): Promise<void> => {
  dbReady ??= initDb();
  return dbReady;
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    await ensureDbReady();
    app(req, res);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Serverless function failed";

    console.error("Vercel function startup failed", error);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          message,
        }),
      );
    }
  }
}
