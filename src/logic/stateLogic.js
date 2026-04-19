import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { applySessionDecay, finalizeSessionState, getLockedReply } from "./sessionGuard.js";
import { formatUtc8Timestamp, getUtc8Parts } from "../utils/time.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionsDir = path.resolve(__dirname, "../../data/sessions");
const SESSION_STATE_FILENAME = "session-state.json";
const DEBUG_STATE_FILENAME = "debug-state.json";
const TEMP_SUFFIX = ".tmp";

const RELATIONSHIP_MAX = 10;
const CONDITION_MAX = 100;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clampRelationshipGroup(group = {}) {
  const currentCounterpart = typeof group.currentCounterpart === "string" ? group.currentCounterpart.trim() : "";

  return {
    trust: clamp(group.trust, 0, RELATIONSHIP_MAX),
    familiarity: clamp(group.familiarity, 0, RELATIONSHIP_MAX),
    annoyance: clamp(group.annoyance, 0, RELATIONSHIP_MAX),
    offense: clamp(group.offense, 0, RELATIONSHIP_MAX),
    boundaryPressure: clamp(group.boundaryPressure, 0, RELATIONSHIP_MAX),
    currentCounterpart: currentCounterpart || null
  };
}

function clampConditionGroup(group = {}) {
  return {
    fatigue: clamp(group.fatigue, 0, CONDITION_MAX),
    busyness: clamp(group.busyness, 0, CONDITION_MAX),
    irritability: clamp(group.irritability, 0, CONDITION_MAX),
    hunger: clamp(group.hunger, 0, CONDITION_MAX),
    health: clamp(group.health, 0, CONDITION_MAX)
  };
}

function formatSessionId(now = new Date()) {
  const parts = getUtc8Parts(now);
  return `session_${parts.year}${parts.month}${parts.day}-${parts.hours}${parts.minutes}${parts.seconds}`;
}

export function createSessionId(now = new Date()) {
  return `session_${randomUUID()}_${formatSessionId(now)}`;
}

export function ensureSessionId(sessionId, now = new Date()) {
  const normalized = typeof sessionId === "string" ? sessionId.trim() : "";
  return SESSION_ID_PATTERN.test(normalized) ? normalized : createSessionId(now);
}

function getSessionDir(sessionId) {
  return path.join(sessionsDir, sessionId);
}

function getSessionStateFile(sessionId) {
  return path.join(getSessionDir(sessionId), SESSION_STATE_FILENAME);
}

function getDebugStateFile(sessionId) {
  return path.join(getSessionDir(sessionId), DEBUG_STATE_FILENAME);
}

function getTempFilePath(filePath) {
  return `${filePath}${TEMP_SUFFIX}`;
}

export function createDefaultSessionState(sessionId = null, now = new Date()) {
  const resolvedSessionId = ensureSessionId(sessionId, now);
  const timestamp = formatUtc8Timestamp(now);

  return {
    sessionId: resolvedSessionId,
    meta: {
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1
    },
    lock: {
      lockedUntil: null,
      reason: null
    },
    relationship: {
      trust: 0,
      familiarity: 1,
      annoyance: 0,
      offense: 0,
      boundaryPressure: 0,
      currentCounterpart: "Ludwig"
    },
    condition: {
      fatigue: 20,
      busyness: 50,
      irritability: 10,
      hunger: 30,
      health: 85
    },
    schedule: {
      mode: "working",
      sleepDisturbCount: 0,
      lastSleepDisturbAt: null,
      currentBlock: null
    },
    conversation: {
      turnCount: 0,
      currentTopic: null,
      sensitiveTopicCount: 0,
      offensiveCount: 0,
      repeatedMessageCount: 0,
      lastUserMessageAt: null,
      lastAssistantMessageAt: null,
      lastUserMessageText: null
    },
    privacy: {
      privacyStrikes: 0,
      lastSensitiveTopic: null,
      refusalCount: 0
    },
    derived: {
      mood: "calm",
      availability: "limited",
      toneBias: "neutral"
    }
  };
}

function normalizeSessionState(value, sessionId = null) {
  const defaults = createDefaultSessionState(sessionId);
  const state = value || {};

  return {
    ...defaults,
    ...state,
    sessionId: ensureSessionId(state.sessionId || defaults.sessionId),
    meta: {
      ...defaults.meta,
      ...(state.meta || {})
    },
    lock: {
      ...defaults.lock,
      ...(state.lock || {})
    },
    relationship: clampRelationshipGroup({
      ...defaults.relationship,
      ...(state.relationship || {})
    }),
    condition: clampConditionGroup({
      ...defaults.condition,
      ...(state.condition || {})
    }),
    schedule: {
      ...defaults.schedule,
      ...(state.schedule || {})
    },
    conversation: {
      ...defaults.conversation,
      ...(state.conversation || {})
    },
    privacy: {
      ...defaults.privacy,
      ...(state.privacy || {})
    },
    derived: {
      ...defaults.derived,
      ...(state.derived || {})
    }
  };
}

async function writeRawSessionState(state) {
  const normalized = normalizeSessionState(state, state?.sessionId);
  const sessionId = normalized.sessionId;
  const sessionDir = getSessionDir(sessionId);
  const sessionStateFile = getSessionStateFile(sessionId);
  const debugStateFile = getDebugStateFile(sessionId);
  const sessionStateTempFile = getTempFilePath(sessionStateFile);
  const debugStateTempFile = getTempFilePath(debugStateFile);
  const stateContent = `${JSON.stringify(normalized, null, 2)}\n`;
  const debugContent = `${JSON.stringify(snapshotSessionState(normalized), null, 2)}\n`;

  await fs.mkdir(sessionDir, { recursive: true });
  await fs.writeFile(sessionStateTempFile, stateContent, "utf-8");
  await fs.rename(sessionStateTempFile, sessionStateFile);
  await fs.writeFile(debugStateTempFile, debugContent, "utf-8");
  await fs.rename(debugStateTempFile, debugStateFile);

  return normalized;
}

export async function readSessionState(sessionId) {
  const resolvedSessionId = ensureSessionId(sessionId);
  const sessionStateFile = getSessionStateFile(resolvedSessionId);

  try {
    const raw = await fs.readFile(sessionStateFile, "utf-8");
    return normalizeSessionState(JSON.parse(raw), resolvedSessionId);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      const initialState = createDefaultSessionState(resolvedSessionId);
      await writeRawSessionState(initialState);
      return initialState;
    }

    throw error;
  }
}

export async function saveSessionState(state, now = new Date()) {
  const normalized = normalizeSessionState(clone(state), state?.sessionId);
  normalized.meta.updatedAt = formatUtc8Timestamp(now);
  normalized.meta.version = Math.max(1, Number(normalized.meta.version || 1)) + 1;
  return writeRawSessionState(normalized);
}

export async function readActiveSessionState(sessionId, now = new Date()) {
  return finalizeSessionState( 
    applySessionDecay(await readSessionState(sessionId), now),
    now
  )
}

export async function updateSessionState(sessionId, updater, now = new Date()) {
  const currentState = await readActiveSessionState(sessionId, now);
  const nextState = await updater(clone(currentState));
  return saveSessionState(nextState, now);
}

export async function readActiveLockMessage(sessionId, now = new Date()) {
  return getLockedReply(await readActiveSessionState(sessionId, now), now);
}

export async function resetSessionState(sessionId, now = new Date()) {
  return writeRawSessionState(createDefaultSessionState(sessionId, now));
}

export function isSessionLocked(state, now = new Date()) {
  if (!state?.lock?.lockedUntil) {
    return false;
  }

  return new Date(state.lock.lockedUntil).getTime() > now.getTime();
}

export function snapshotSessionState(state) {
  return clone(normalizeSessionState(state, state?.sessionId));
}