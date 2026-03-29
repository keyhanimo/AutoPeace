import { logger } from "../lib/logger";
import { seedStakeholders } from "./stakeholders";
import { seedSources } from "./sources";
import { seedCosts } from "./costs";

export async function runSeed(): Promise<void> {
  try {
    logger.info("Running seed...");
    await seedStakeholders();
    await seedSources();
    await seedCosts();
    logger.info("Seed complete");
  } catch (err) {
    logger.error({ err }, "Seed failed");
  }
}
