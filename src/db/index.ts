import { Pool } from "pg";
import config from "../config/index.js";

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export const initDb = async (): Promise<void> => {
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
