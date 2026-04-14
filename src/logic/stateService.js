import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateDir = path.resolve(__dirname, "../../data/state");
const sessionStateFile = path.join(stateDir, "session-state.json");

const RELATIONSHIP_MAX = 10;
const CONDITION_MAX = 100;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clampRelationshipGroup(group = {}) {
  return {
    trust: clamp(group.trust, 0, RELATIONSHIP_MAX),
    familiarity: clamp(group.familiarity, 0, RELATIONSHIP_MAX),
    annoyance: clamp(group.annoyance, 0, RELATIONSHIP_MAX),
    offense: clamp(group.offense, 0, RELATIONSHIP_MAX),
    boundaryPressure: clamp(group.boundaryPressure, 0, RELATIONSHIP_MAX)
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

export function createDefaultSessionState(sessionId = "session_001", now = new Date()) {
  const timestamp = now.toISOString();

  return {
    sessionId,
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
      boundaryPressure: 0
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
      lastSleepDisturbAt: null
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
      mood: "controlled",
      availability: "limited",
      toneBias: "cool"
    }
  };
}

function normalizeSessionState(value) {
  const defaults = createDefaultSessionState();
  const state = value || {};

  return {
    ...defaults,
    ...state,
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
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(sessionStateFile, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
  return state;
}

export async function readSessionState() {
  try {
    const raw = await fs.readFile(sessionStateFile, "utf-8");
    return normalizeSessionState(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      const initialState = createDefaultSessionState();
      await writeRawSessionState(initialState);
      return initialState;
    }

    throw error;
  }
}

export async function saveSessionState(state, now = new Date()) {
  const normalized = normalizeSessionState(clone(state));
  normalized.meta.updatedAt = now.toISOString();
  normalized.meta.version = Math.max(1, Number(normalized.meta.version || 1)) + 1;
  return writeRawSessionState(normalized);
}

export async function resetSessionState(sessionId = "session_001", now = new Date()) {
  return writeRawSessionState(createDefaultSessionState(sessionId, now));
}

export function isSessionLocked(state, now = new Date()) {
  if (!state?.lock?.lockedUntil) {
    return false;
  }

  return new Date(state.lock.lockedUntil).getTime() > now.getTime();
}

export function snapshotSessionState(state) {
  return clone(normalizeSessionState(state));
}
