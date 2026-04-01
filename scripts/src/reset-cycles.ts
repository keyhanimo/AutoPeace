import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== AutoPeace Cycle Reset ===");
  console.log("This will DELETE all cycle-produced data and reset the system to cycle 1.");
  console.log("");

  const tables = [
    "provision_outcomes",
    "solution_tree",
    "deals",
    "forecasts",
    "experiments",
    "changelog_entries",
    "pipeline_evolution",
    "cycles",
  ];

  for (const table of tables) {
    const result = await db.execute(sql.raw(`DELETE FROM "${table}"`));
    const count = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    console.log(`  Cleared ${table}: ${count} rows deleted`);
  }

  await db.execute(
    sql`DELETE FROM "admin_config" WHERE "key" = 'latestStrategicSummary'`
  );
  console.log("  Cleared cached strategic summary from admin_config");

  await db.execute(
    sql`UPDATE "evidence_items" SET "influenced_cycle_id" = NULL, "influenced_forecast_id" = NULL WHERE "influenced_cycle_id" IS NOT NULL`
  );
  console.log("  Unlinked evidence items from deleted cycles (evidence data preserved)");

  console.log("");
  console.log("Reset complete. The system will start fresh from cycle 1.");
  console.log("Evidence items, stakeholders, evidence sources, cost-of-war data,");
  console.log("real-world proposals, and admin config are preserved.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exit(1);
  });
