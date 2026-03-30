import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getCycleStatus } from "../services/autoresearch";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/status", (_req, res) => {
  const status = getCycleStatus();
  res.json({
    isRunning: status.isRunning,
    stage: status.stage,
    stagesCompleted: status.stagesCompleted,
    cycleStartedAt: status.cycleStartedAt,
  });
});

export default router;
