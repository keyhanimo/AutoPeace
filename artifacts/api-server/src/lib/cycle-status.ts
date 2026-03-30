import { EventEmitter } from "node:events";

export type CycleStage =
  | "starting"
  | "evidence_ingestion"
  | "proposal_extraction"
  | "forecasting"
  | "red_team"
  | "hill_climbing"
  | "deal_engine"
  | "changelog"
  | "completed"
  | "failed";

export type DealSubStage =
  | "brainstorm"
  | "proposal"
  | "stakeholders"
  | "domestic"
  | "framing"
  | "redteam"
  | "negotiator"
  | "judge"
  | "meta_eval"
  | "diagnosis";

export interface CycleStatus {
  isRunning: boolean;
  cycleId: string | null;
  stage: CycleStage | null;
  dealSubStage: DealSubStage | null;
  stageStartedAt: number | null;
  cycleStartedAt: number | null;
  stagesCompleted: string[];
  lastError: string | null;
}

let currentStage: CycleStage | null = null;
let currentDealSubStage: DealSubStage | null = null;
let stageStartedAt: number | null = null;
let cycleStartedAt: number | null = null;
let stagesCompleted: string[] = [];
let lastCycleError: string | null = null;
let runningCycleId: string | null = null;

export const cycleEvents = new EventEmitter();
cycleEvents.setMaxListeners(100);

export function getCycleStatus(): CycleStatus {
  return {
    isRunning: runningCycleId !== null,
    cycleId: runningCycleId,
    stage: currentStage,
    dealSubStage: currentStage === "deal_engine" ? currentDealSubStage : null,
    stageStartedAt,
    cycleStartedAt,
    stagesCompleted: [...stagesCompleted],
    lastError: lastCycleError,
  };
}

export function setStage(stage: CycleStage) {
  if (currentStage && currentStage !== "starting" && currentStage !== "failed" && currentStage !== "completed") {
    stagesCompleted.push(currentStage);
  }
  currentStage = stage;
  currentDealSubStage = null;
  stageStartedAt = Date.now();
  cycleEvents.emit("change", getCycleStatus());
}

export function setDealSubStage(subStage: DealSubStage) {
  currentDealSubStage = subStage;
  cycleEvents.emit("change", getCycleStatus());
}

export function setRunningCycleId(id: string | null) {
  runningCycleId = id;
}

export function setCycleStartedAt(ts: number | null) {
  cycleStartedAt = ts;
}

export function resetCycleState() {
  stagesCompleted = [];
  lastCycleError = null;
}

export function setLastCycleError(err: string | null) {
  lastCycleError = err;
}
