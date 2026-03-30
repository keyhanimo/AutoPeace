import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getCycleStatus, getNextRunAt, cycleEvents, type CycleStatus } from "../services/autoresearch";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

async function statusPayload(s: CycleStatus) {
  const nextRunAt = s.isRunning ? null : await getNextRunAt();
  return {
    isRunning: s.isRunning,
    cycleId: s.cycleId,
    stage: s.stage,
    stageStartedAt: s.stageStartedAt,
    cycleStartedAt: s.cycleStartedAt,
    stagesCompleted: s.stagesCompleted,
    lastError: s.lastError,
    nextRunAt,
  };
}

router.get("/status", async (_req, res) => {
  res.json(await statusPayload(getCycleStatus()));
});

router.get("/status/stream", async (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = async (status: CycleStatus) => {
    const payload = await statusPayload(status);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  await send(getCycleStatus());

  const onChange = (status: CycleStatus) => { void send(status); };
  cycleEvents.on("change", onChange);

  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 30_000);

  req.on("close", () => {
    cycleEvents.off("change", onChange);
    clearInterval(keepAlive);
  });
});

export default router;
