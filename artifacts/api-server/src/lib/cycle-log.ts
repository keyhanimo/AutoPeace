import { EventEmitter } from "node:events";

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

let entryCounter = 0;
let currentCycleLogs: CycleLogEntry[] = [];
let previousCycleLogs: CycleLogEntry[] = [];
let currentLogCycleId: string | null = null;

export const cycleLogEvents = new EventEmitter();
cycleLogEvents.setMaxListeners(100);

export function emitCycleLog(entry: Omit<CycleLogEntry, "id" | "timestamp">): void {
  if (entry.cycleId !== currentLogCycleId) {
    previousCycleLogs = [...currentCycleLogs];
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
