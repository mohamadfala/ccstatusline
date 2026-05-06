import { logoSegment } from "./logo.js";
import { modelSegment } from "./model.js";
import { dirSegment } from "./dir.js";
import { timeSegment } from "./time.js";
import { outputStyleSegment } from "./output-style.js";
import { contextSegment } from "./context.js";
import { costSegment } from "./cost.js";
import { tokensSegment } from "./tokens.js";
import { elapsedSegment } from "./elapsed.js";
import { todosSegment } from "./todos.js";
import { burnRateSegment } from "./burn-rate.js";
import { customSegment } from "./custom.js";
import { branchSegment } from "./branch.js";
import { gitAheadSegment } from "./git-ahead.js";
import { batterySegment } from "./battery.js";
import { apiHealthSegment } from "./api-health.js";
import { versionSegment } from "./version.js";
export const SEGMENTS = [
    logoSegment,
    modelSegment,
    contextSegment,
    costSegment,
    tokensSegment,
    branchSegment,
    dirSegment,
    burnRateSegment,
    elapsedSegment,
    gitAheadSegment,
    outputStyleSegment,
    versionSegment,
    todosSegment,
    timeSegment,
    batterySegment,
    apiHealthSegment,
    customSegment
];
export const SEGMENTS_BY_ID = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]));
