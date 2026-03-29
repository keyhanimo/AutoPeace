import app from "./app";
import { logger } from "./lib/logger";
import { runSeed } from "./seed";
import { startScheduler } from "./services/autoresearch";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function verifyDatabaseReady(): Promise<void> {
  try {
    await db.execute(sql`SELECT 1`);
    const tablesResult = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('forecasts', 'cycles', 'stakeholders', 'admin_config')`
    );
    const found = (tablesResult.rows as Array<{ table_name: string }>).map(r => r.table_name);
    const required = ["forecasts", "cycles", "stakeholders", "admin_config"];
    const missing = required.filter(t => !found.includes(t));
    if (missing.length > 0) {
      logger.warn({ missing }, "Required DB tables not yet created — run `pnpm --filter @workspace/db run push` to provision schema");
    } else {
      logger.info({ tables: required }, "Database readiness check passed");
    }
  } catch (err) {
    logger.error({ err }, "Database connection failed — server will still start but requests may fail");
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  await verifyDatabaseReady();
  await runSeed();
  await startScheduler();
});
