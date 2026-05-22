import app from "./app.js";
import config from "./config/index.js";
import { initDb, pool } from "./db/index.js";

const main = async (): Promise<void> => {
  try {
    await initDb();

    app.listen(config.port, () => {
      console.log(`DevPulse API listening on port ${config.port}`);
    });
  } catch (error) {
    console.error("Failed to start DevPulse API", error);
    await pool.end();
    process.exit(1);
  }
};

void main();
