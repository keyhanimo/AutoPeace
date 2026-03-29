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
    logger.error({ issues: result.error?.issues }, "Response schema validation failed — refusing to send malformed payload");
    res.status(500).json({ error: "Internal response schema validation failed" });
    return;
  }
  res.status(status).json(data);
}
