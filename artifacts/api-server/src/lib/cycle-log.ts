import { EventEmitter } from "node:events";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export type CycleLogLevel = "info" | "warn" | "error" | "stage" | "llm_start" | "llm_complete" | "llm_error";

export interface CycleLogEntry {
  id: number;
  timestamp: number;
  cycleId: string;
  level: CycleLogLevel;
  stage: string;
  message: string;
  durationMs?: number;
  tokens?: number;
  prompt?: string;
  output?: string;
  provider?: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

const MAX_ENTRIES_PER_CYCLE = 5000;
const PERSIST_DIR = join(process.cwd(), ".data");
const PREVIOUS_LOGS_FILE = join(PERSIST_DIR, "previous-cycle-logs.json");

let entryCounter = 0;
let currentCycleLogs: CycleLogEntry[] = [];
let previousCycleLogs: CycleLogEntry[] = [];
let currentLogCycleId: string | null = null;

export const cycleLogEvents = new EventEmitter();
cycleLogEvents.setMaxListeners(100);

async function persistPreviousLogs(): Promise<void> {
  try {
    await mkdir(PERSIST_DIR, { recursive: true });
    await writeFile(PREVIOUS_LOGS_FILE, JSON.stringify(previousCycleLogs), "utf-8");
  } catch {}
}

async function loadPersistedPreviousLogs(): Promise<void> {
  try {
    const raw = await readFile(PREVIOUS_LOGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      previousCycleLogs = parsed;
      const maxId = parsed.reduce((max: number, e: CycleLogEntry) => Math.max(max, e.id ?? 0), 0);
      if (maxId > entryCounter) entryCounter = maxId;
    }
  } catch {}
}

const _loadPromise = loadPersistedPreviousLogs();

export async function waitForLogsLoaded(): Promise<void> {
  await _loadPromise;
}

export function emitCycleLog(entry: Omit<CycleLogEntry, "id" | "timestamp">): void {
  if (entry.cycleId !== currentLogCycleId) {
    if (currentCycleLogs.length > 0) {
      previousCycleLogs = [...currentCycleLogs];
      void persistPreviousLogs();
    }
    currentCycleLogs = [];
    currentLogCycleId = entry.cycleId;
  }

  const full: CycleLogEntry = {
    ...entry,
    id: ++entryCounter,
    timestamp: Date.now(),
  };

  currentCycleLogs.push(full);
  if (currentCycleLogs.length > MAX_ENTRIES_PER_CYCLE) {
    currentCycleLogs = currentCycleLogs.slice(-MAX_ENTRIES_PER_CYCLE);
  }
  cycleLogEvents.emit("entry", full);
}

export function getCurrentCycleLogs(): CycleLogEntry[] {
  return currentCycleLogs;
}

export function getPreviousCycleLogs(): CycleLogEntry[] {
  return previousCycleLogs;
}

export function getCurrentLogCycleId(): string | null {
  return currentLogCycleId;
}

export function markCurrentCycleComplete(): void {
  if (currentCycleLogs.length > 0) {
    previousCycleLogs = [...currentCycleLogs];
    void persistPreviousLogs();
  }
}

export function truncateForLog(text: string | undefined, maxLen = 500): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + `... [${text.length - maxLen} more chars]`;
}

let _activeCycleId: string | null = null;
let _activeCycleStage: string | null = null;

export function setActiveCycleContext(cycleId: string, stage: string): void {
  _activeCycleId = cycleId;
  _activeCycleStage = stage;
}

export function clearActiveCycleContext(): void {
  _activeCycleId = null;
  _activeCycleStage = null;
}

export function getActiveCycleContext(): { cycleId: string; stage: string } | null {
  if (!_activeCycleId || !_activeCycleStage) return null;
  return { cycleId: _activeCycleId, stage: _activeCycleStage };
}
