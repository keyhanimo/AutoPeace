import { logger } from "../lib/logger";
import { seedStakeholders } from "./stakeholders";
import { seedSources } from "./sources";
import { seedCosts } from "./costs";
import { seedHistoricalForecasts } from "./historical-forecasts";
import { seedProposals } from "./proposals";

export async function runSeed(): Promise<void> {
  try {
    logger.info("Running seed...");
    await seedStakeholders();
    await seedSources();
    await seedCosts();
    await seedHistoricalForecasts();
    await seedProposals();
    logger.info("Seed complete");
  } catch (err) {
    logger.error({ err }, "Seed failed");
  }
}
