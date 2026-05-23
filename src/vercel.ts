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
  await ensureDbReady();
  app(req, res);
}
