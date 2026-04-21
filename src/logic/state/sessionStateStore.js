import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { applySessionDecay, finalizeSessionState, getLockedReply } from "./sessionStateEngine.js";
import { buildDefaultRationalDefense } from "../guards/rationalStateEvaluator.js";
import { formatUtc8Timestamp, getUtc8Parts } from "../../utils/time.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionsDir = path.resolve(__dirname, "../../../data/sessions");
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

function normalizeRelationshipGroup(group = {}) {
  const currentCounterpart = typeof group.currentCounterpart === "string" ? group.currentCounterpart.trim() : "";

  return {
    trust: clamp(group.trust, 0, RELATIONSHIP_MAX),
    familiarity: clamp(group.familiarity, 0, RELATIONSHIP_MAX),
    annoyance: clamp(group.annoyance, 0, RELATIONSHIP_MAX),
    offense: clamp(group.offense, 0, RELATIONSHIP_MAX),
    boundaryPressure: clamp(group.boundaryPressure, 0, RELATIONSHIP_MAX),
    attachment: clamp(group.attachment, 0, RELATIONSHIP_MAX),
    dependency: clamp(group.dependency, 0, RELATIONSHIP_MAX),
    protectiveness: clamp(group.protectiveness, 0, RELATIONSHIP_MAX),
    resentment: clamp(group.resentment, 0, RELATIONSHIP_MAX),
    currentCounterpart: currentCounterpart || null
  };
}

function normalizeConditionGroup(group = {}) {
  return {
    fatigue: clamp(group.fatigue, 0, CONDITION_MAX),
    busyness: clamp(group.busyness, 0, CONDITION_MAX),
    irritability: clamp(group.irritability, 0, CONDITION_MAX),
    hunger: clamp(group.hunger, 0, CONDITION_MAX),
    health: clamp(group.health, 0, CONDITION_MAX),
    insight: clamp(group.insight, 0, CONDITION_MAX),
    frenzy: clamp(group.frenzy, 0, CONDITION_MAX),
    drowsiness: clamp(group.drowsiness, 0, CONDITION_MAX)
  };
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeNullableString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeAffectGroup(group = {}) {
  return {
    warmth: clamp(group.warmth, 0, CONDITION_MAX),
    aggression: clamp(group.aggression, 0, CONDITION_MAX),
    melancholy: clamp(group.melancholy, 0, CONDITION_MAX),
    playfulness: clamp(group.playfulness, 0, CONDITION_MAX),
    dependency: clamp(group.dependency, 0, CONDITION_MAX),
    contempt: clamp(group.contempt, 0, CONDITION_MAX),
    devotion: clamp(group.devotion, 0, CONDITION_MAX),
    intellectualDrive: clamp(group.intellectualDrive, 0, CONDITION_MAX),
    shyness: clamp(group.shyness, 0, CONDITION_MAX),
    awkwardness: clamp(group.awkwardness, 0, CONDITION_MAX)
  };
}

function normalizeExpressionGroup(group = {}) {
  return {
    sarcasm: clamp(group.sarcasm, 0, CONDITION_MAX),
    dryness: clamp(group.dryness, 0, CONDITION_MAX),
    verbosity: clamp(group.verbosity, 0, CONDITION_MAX),
    philosophicalDrift: clamp(group.philosophicalDrift, 0, CONDITION_MAX),
    teasing: clamp(group.teasing, 0, CONDITION_MAX),
    emotionalLeak: clamp(group.emotionalLeak, 0, CONDITION_MAX),
    selfSuppression: clamp(group.selfSuppression, 0, CONDITION_MAX),
    sermonizing: clamp(group.sermonizing, 0, CONDITION_MAX),
    stubbornness: clamp(group.stubbornness, 0, CONDITION_MAX),
    speechless: clamp(group.speechless, 0, CONDITION_MAX)
  };
}

function normalizeConversationGroup(group = {}) {
  return {
    turnCount: clamp(group.turnCount, 0, Number.MAX_SAFE_INTEGER),
    currentTopic: normalizeNullableString(group.currentTopic),
    recentTopics: normalizeStringArray(group.recentTopics),
    activeEntities: normalizeStringArray(group.activeEntities),
    topicTags: normalizeStringArray(group.topicTags),
    sensitiveTopicCount: clamp(group.sensitiveTopicCount, 0, Number.MAX_SAFE_INTEGER),
    offensiveCount: clamp(group.offensiveCount, 0, Number.MAX_SAFE_INTEGER),
    repeatedMessageCount: clamp(group.repeatedMessageCount, 0, Number.MAX_SAFE_INTEGER),
    lastUserMessageAt: normalizeNullableString(group.lastUserMessageAt),
    lastAssistantMessageAt: normalizeNullableString(group.lastAssistantMessageAt),
    lastUserMessageText: normalizeNullableString(group.lastUserMessageText)
  };
}

function normalizePrivacyGroup(group = {}) {
  return {
    privacyStrikes: clamp(group.privacyStrikes, 0, Number.MAX_SAFE_INTEGER),
    lastSensitiveTopic: normalizeNullableString(group.lastSensitiveTopic),
    refusalCount: clamp(group.refusalCount, 0, Number.MAX_SAFE_INTEGER)
  };
}

function normalizeJudgmentGroup(group = {}) {
  return {
    suspicion: clamp(group.suspicion, 0, CONDITION_MAX),
    moralDisapproval: clamp(group.moralDisapproval, 0, CONDITION_MAX),
    disappointment: clamp(group.disappointment, 0, CONDITION_MAX),
    lastTrigger: normalizeNullableString(group.lastTrigger)
  };
}

function buildDefaultRationalDefenseState() {
  return {
    ...buildDefaultRationalDefense(),
    permissionProfile: "guarded",
    responseBias: "neutral"
  };
}

function normalizeRationalDefenseGroup(group = {}) {
  const defaults = buildDefaultRationalDefenseState();
  const dominantMode = typeof group.dominantMode === "string" && group.dominantMode.trim()
    ? group.dominantMode.trim()
    : defaults.dominantMode;
  const lastTrigger = normalizeNullableString(group.lastTrigger);
  const lastShiftAt = normalizeNullableString(group.lastShiftAt);
  const permissionProfile = normalizeNullableString(group.permissionProfile) || defaults.permissionProfile;
  const responseBias = normalizeNullableString(group.responseBias) || defaults.responseBias;

  return {
    ...defaults,
    ...group,
    level: clamp(group.level, 0, CONDITION_MAX),
    dominantMode,
    suppressionStrength: clamp(group.suppressionStrength, 0, CONDITION_MAX),
    vigilance: clamp(group.vigilance, 0, CONDITION_MAX),
    contradictionLoad: clamp(group.contradictionLoad, 0, CONDITION_MAX),
    permissionProfile,
    responseBias,
    lastTrigger,
    lastShiftAt
  };
}

function normalizeInterestStateGroup(group = {}) {
  return {
    currentHits: normalizeStringArray(group.currentHits),
    enthusiasmBoost: clamp(group.enthusiasmBoost, 0, CONDITION_MAX),
    topicCapture: clamp(group.topicCapture, 0, CONDITION_MAX),
    counterpartAttention: clamp(group.counterpartAttention, 0, CONDITION_MAX),
    lectureMode: Boolean(group.lectureMode),
    lectureStyle: normalizeNullableString(group.lectureStyle),
    lastActivatedTopic: normalizeNullableString(group.lastActivatedTopic),
    activeSinceTurn: clamp(group.activeSinceTurn, 0, Number.MAX_SAFE_INTEGER)
  };
}

function normalizeMemoryGroup(group = {}) {
  return {
    establishedFacts: normalizeStringArray(group.establishedFacts),
    activeThreads: normalizeStringArray(group.activeThreads),
    unresolvedThreads: normalizeStringArray(group.unresolvedThreads)
  };
}

function normalizeDerivedGroup(group = {}) {
  return {
    mood: normalizeNullableString(group.mood) || "calm",
    availability: normalizeNullableString(group.availability) || "limited",
    expressionProfile: normalizeNullableString(group.expressionProfile)
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
      version: 2
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
      attachment: 0,
      dependency: 0,
      protectiveness: 0,
      resentment: 0,
      currentCounterpart: "Hunter"
    },
    condition: {
      fatigue: 20,
      busyness: 50,
      irritability: 10,
      hunger: 30,
      health: 85,
      insight: 8,
      frenzy: 4,
      drowsiness: 6
    },
    affect: {
      warmth: 10,
      aggression: 12,
      melancholy: 8,
      playfulness: 4,
      dependency: 4,
      contempt: 4,
      devotion: 6,
      intellectualDrive: 20,
      shyness: 4,
      awkwardness: 6
    },
    expression: {
      sarcasm: 20,
      dryness: 35,
      verbosity: 20,
      philosophicalDrift: 12,
      teasing: 10,
      emotionalLeak: 6,
      selfSuppression: 50,
      sermonizing: 10,
      stubbornness: 40,
      speechless: 4
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
      recentTopics: [],
      activeEntities: [],
      topicTags: [],
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
    judgment: {
      suspicion: 0,
      moralDisapproval: 0,
      disappointment: 0,
      lastTrigger: null
    },
    interestState: {
      currentHits: [],
      enthusiasmBoost: 0,
      topicCapture: 0,
      counterpartAttention: 100,
      lectureMode: false,
      lectureStyle: null,
      lastActivatedTopic: null,
      activeSinceTurn: 0
    },
    rationalDefense: buildDefaultRationalDefenseState(),
    memory: {
      establishedFacts: [],
      activeThreads: [],
      unresolvedThreads: []
    },
    derived: {
      mood: "calm",
      availability: "limited",
      expressionProfile: null
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
    relationship: normalizeRelationshipGroup({
      ...defaults.relationship,
      ...(state.relationship || {})
    }),
    condition: normalizeConditionGroup({
      ...defaults.condition,
      ...(state.condition || {})
    }),
    affect: normalizeAffectGroup({
      ...defaults.affect,
      ...(state.affect || {})
    }),
    expression: normalizeExpressionGroup({
      ...defaults.expression,
      ...(state.expression || {})
    }),
    schedule: {
      ...defaults.schedule,
      ...(state.schedule || {})
    },
    conversation: normalizeConversationGroup({
      ...defaults.conversation,
      ...(state.conversation || {})
    }),
    privacy: normalizePrivacyGroup({
      ...defaults.privacy,
      ...(state.privacy || {})
    }),
    judgment: normalizeJudgmentGroup({
      ...defaults.judgment,
      ...(state.judgment || {})
    }),
    interestState: normalizeInterestStateGroup({
      ...defaults.interestState,
      ...(state.interestState || {})
    }),
    rationalDefense: normalizeRationalDefenseGroup({
      ...defaults.rationalDefense,
      ...(state.rationalDefense || {})
    }),
    memory: normalizeMemoryGroup({
      ...defaults.memory,
      ...(state.memory || {})
    }),
    derived: normalizeDerivedGroup({
      ...defaults.derived,
      ...(state.derived || {})
    })
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
  normalized.meta.version = Math.max(2, Number(normalized.meta.version || 2)) + 1;
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
