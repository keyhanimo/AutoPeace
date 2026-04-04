import { Router } from "express";
import { cycleLogEvents, getCurrentCycleLogs, getPreviousCycleLogs, getCurrentLogCycleId, waitForLogsLoaded, type CycleLogEntry } from "../lib/cycle-log";
import { getCycleStatus, cycleEvents } from "../lib/cycle-status";
import { getNextRunAt } from "../services/autoresearch";

const router = Router();

router.get("/live/stream", async (req, res) => {
  await waitForLogsLoaded();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const buffered: CycleLogEntry[] = [];
  const onEntryBuffer = (entry: CycleLogEntry) => { buffered.push(entry); };
  cycleLogEvents.on("entry", onEntryBuffer);

  const status = getCycleStatus();
  const logs = getCurrentCycleLogs();
  const previousLogs = getPreviousCycleLogs();

  cycleLogEvents.off("entry", onEntryBuffer);

  const seenIds = new Set(logs.map(l => l.id));
  const missed = buffered.filter(e => !seenIds.has(e.id));
  const allLogs = [...logs, ...missed];

  const initPayload = {
    type: "init" as const,
    status,
    currentLogs: allLogs,
    previousLogs,
    currentLogCycleId: getCurrentLogCycleId(),
  };
  res.write(`data: ${JSON.stringify(initPayload)}\n\n`);

  const onEntry = (entry: CycleLogEntry) => {
    res.write(`data: ${JSON.stringify({ type: "entry", entry })}\n\n`);
  };

  const onStatusChange = () => {
    const s = getCycleStatus();
    res.write(`data: ${JSON.stringify({ type: "status", status: s })}\n\n`);
  };

  cycleLogEvents.on("entry", onEntry);
  cycleEvents.on("change", onStatusChange);

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  req.on("close", () => {
    cycleLogEvents.off("entry", onEntry);
    cycleEvents.off("change", onStatusChange);
    clearInterval(heartbeat);
  });
});

router.get("/live/next-run", async (_req, res) => {
  const nextRun = await getNextRunAt();
  res.json({ nextRunAt: nextRun });
});

export default router;
