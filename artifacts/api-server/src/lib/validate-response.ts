import type { Response } from "express";
import { logger } from "./logger";

interface Schema {
  safeParse(data: unknown): { success: boolean; error?: { issues: unknown[] } };
}

export function sendValidated(
  res: Response,
  schema: Schema,
  data: unknown,
  status = 200
): void {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn({ issues: result.error?.issues }, "Response validation warning");
  }
  res.status(status).json(data);
}
