import { isSessionLocked } from "./stateService.js";
import {
  BASE_OFFENSE_PATTERNS,
  DEEP_PRIVATE_KEYWORDS,
  FRIENDLY_KEYWORDS,
  INTRUSIVE_KEYWORDS,
  OFFENSIVE_KEYWORDS,
  RELATIONSHIP_PATTERNS,
  SOFT_PRIVATE_KEYWORDS,
  VULNERABLE_PATTERNS
} from "../config/sessionKeywords.js";

const TIME_ZONE = "America/Los_Angeles";
const RELATIONSHIP_TOPIC = "ludwig_relationship";
const RELATIONSHIP_MAX = 10;
const CONDITION_MAX = 100;
const RELATIONSHIP_BASE_IRRITABILITY = 10;

const OFFENSE_PATTERNS = [
  ...BASE_OFFENSE_PATTERNS,
  ...OFFENSIVE_KEYWORDS.map((keyword) => new RegExp(keyword, "i"))
];

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clampRelationship(value) {
  return clamp(value, 0, RELATIONSHIP_MAX);
}

function clampCondition(value) {
  return clamp(value, 0, CONDITION_MAX);
}

function includesAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeMessageText(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .slice(0, 40);
}

function isShortSinglePhrase(text) {
  const normalized = normalizeMessageText(text);
  return normalized.length > 0 && normalized.length <= 4;
}

function getPrivacyLevel(text) {
  if (includesAnyKeyword(text, INTRUSIVE_KEYWORDS)) {
    return "intrusive";
  }

  if (includesAnyKeyword(text, DEEP_PRIVATE_KEYWORDS)) {
    return "deep_private";
  }

  if (includesAnyKeyword(text, SOFT_PRIVATE_KEYWORDS)) {
    return "soft_private";
  }

  return null;
}

function getLocalParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(
    parts.filter((item) => item.type !== "literal").map((item) => [item.type, item.value])
  );

  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour)
  };
}

function detectTopic(message, previousTopic = null) {
  const text = message.trim();

  if (RELATIONSHIP_PATTERNS.some((pattern) => pattern.test(text)) || getPrivacyLevel(text)) {
    return RELATIONSHIP_TOPIC;
  }

  if (/fiona|菲奥娜/i.test(text)) {
    return "fiona";
  }

  if (/logarius|洛加留斯/i.test(text)) {
    return "logarius";
  }

  if (/brador|布拉多尔/i.test(text)) {
    return "brador";
  }

  if (/church|教会/i.test(text)) {
    return "church";
  }

  if (/吃饭|睡觉|休息|日常|daily/i.test(text)) {
    return "daily_life";
  }

  return previousTopic;
}

function buildDerived(state) {
  const { relationship, condition, lock } = state;

  let mood = "controlled";
  if (relationship.offense >= 7 || relationship.annoyance >= 7) {
    mood = "strained";
  } else if (relationship.boundaryPressure >= 5) {
    mood = "guarded";
  } else if (condition.fatigue >= 65) {
    mood = "tired";
  }

  let availability = "limited";
  if (lock.lockedUntil) {
    availability = "blocked";
  } else if (condition.busyness >= 75 || condition.fatigue >= 70) {
    availability = "low";
  } else if (relationship.trust >= 6 && relationship.annoyance <= 2) {
    availability = "present";
  }

  let toneBias = "cool";
  if (relationship.offense >= 6 || relationship.boundaryPressure >= 6) {
    toneBias = "cold";
  } else if (relationship.trust >= 6 && relationship.familiarity >= 6) {
    toneBias = "gentler";
  }

  return {
    mood,
    availability,
    toneBias
  };
}

export function applySessionDecay(sessionState, now = new Date()) {
  const state = JSON.parse(JSON.stringify(sessionState));
  const previous = new Date(state.meta.updatedAt || state.meta.createdAt || now.toISOString());
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - previous.getTime()) / 60000));

  if (elapsedMinutes >= 30) {
    state.relationship.annoyance = clampRelationship(
      state.relationship.annoyance - Math.floor(elapsedMinutes / 30) * 1
    );
  }

  if (elapsedMinutes >= 60) {
    state.relationship.offense = clampRelationship(
      state.relationship.offense - Math.floor(elapsedMinutes / 60) * 1
    );
    state.condition.fatigue = clampCondition(
      state.condition.fatigue - Math.floor(elapsedMinutes / 60) * 2
    );
  }

  if (elapsedMinutes >= 45 && state.relationship.boundaryPressure > 0) {
    state.relationship.boundaryPressure = clampRelationship(
      state.relationship.boundaryPressure - Math.floor(elapsedMinutes / 45) * 1
    );
  }

  const nowLocal = getLocalParts(now);
  const lastDisturbAt = state.schedule.lastSleepDisturbAt ? new Date(state.schedule.lastSleepDisturbAt) : null;

  if (lastDisturbAt) {
    const disturbLocal = getLocalParts(lastDisturbAt);
    const shouldResetSleepDisturb =
      nowLocal.hour >= 6 &&
      (disturbLocal.dateKey !== nowLocal.dateKey || disturbLocal.hour < 6);

    if (shouldResetSleepDisturb) {
      state.schedule.sleepDisturbCount = 0;
    }
  }

  state.condition.irritability = clampCondition(
    RELATIONSHIP_BASE_IRRITABILITY + state.relationship.annoyance * 5 + state.relationship.offense * 5
  );
  state.derived = buildDerived(state);

  return state;
}

export function applyUserMessageToSessionState(sessionState, message, now = new Date()) {
  const state = applySessionDecay(sessionState, now);
  const text = message.trim();
  const normalizedText = normalizeMessageText(text);
  const previousTopic = state.conversation.currentTopic;
  const nextTopic = detectTopic(text, previousTopic);
  const offensive = OFFENSE_PATTERNS.some((pattern) => pattern.test(text));
  const relationshipProbe = RELATIONSHIP_PATTERNS.some((pattern) => pattern.test(text));
  const privacyLevel = getPrivacyLevel(text);
  const vulnerable = VULNERABLE_PATTERNS.some((pattern) => pattern.test(text));
  const friendly = includesAnyKeyword(text, FRIENDLY_KEYWORDS);
  const local = getLocalParts(now);
  const lateNight = local.hour >= 0 && local.hour < 5;
  const repeatedShortMessage =
    isShortSinglePhrase(text) &&
    normalizedText.length > 0 &&
    normalizedText === state.conversation.lastUserMessageText;

  const repeatedPrivacyContext = Boolean(privacyLevel || relationshipProbe) && state.conversation.sensitiveTopicCount >= 2;
  const repeatedOffenseContext = offensive && state.conversation.offensiveCount >= 2;
  const privacyMultiplier = repeatedPrivacyContext ? 2 : 1;
  const offenseMultiplier = repeatedOffenseContext ? 2 : 1;

  state.conversation.turnCount += 1;
  state.conversation.lastUserMessageAt = now.toISOString();
  state.conversation.currentTopic = nextTopic;

  if (repeatedShortMessage) {
    state.conversation.repeatedMessageCount += 1;
    state.relationship.annoyance = clampRelationship(
      state.relationship.annoyance + Math.min(2, state.conversation.repeatedMessageCount)
    );
  } else {
    state.conversation.repeatedMessageCount = 0;
  }

  if (offensive) {
    state.conversation.offensiveCount += 1;
    state.relationship.offense = clampRelationship(state.relationship.offense + 2 * offenseMultiplier);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance + 1 * offenseMultiplier);
  }

  if (privacyLevel || relationshipProbe) {
    state.conversation.sensitiveTopicCount += 1;
    state.privacy.lastSensitiveTopic = privacyLevel || RELATIONSHIP_TOPIC;
  }

  if (privacyLevel === "soft_private") {
    state.relationship.boundaryPressure = clampRelationship(
      state.relationship.boundaryPressure + 1 * privacyMultiplier
    );

    if (previousTopic === RELATIONSHIP_TOPIC) {
      state.privacy.privacyStrikes = clampCondition(
        state.privacy.privacyStrikes + 1 * privacyMultiplier
      );
    }
  }

  if (privacyLevel === "deep_private") {
    state.relationship.boundaryPressure = clampRelationship(
      state.relationship.boundaryPressure + 2 * privacyMultiplier
    );
    state.relationship.annoyance = clampRelationship(
      state.relationship.annoyance + 1 * privacyMultiplier
    );
    state.privacy.privacyStrikes = clampCondition(
      state.privacy.privacyStrikes + 1 * privacyMultiplier
    );
  }

  if (privacyLevel === "intrusive") {
    state.relationship.boundaryPressure = clampRelationship(
      state.relationship.boundaryPressure + 3 * privacyMultiplier
    );
    state.relationship.annoyance = clampRelationship(
      state.relationship.annoyance + 2 * privacyMultiplier
    );
    state.relationship.offense = clampRelationship(
      state.relationship.offense + 1 * privacyMultiplier
    );
    state.privacy.privacyStrikes = clampCondition(
      state.privacy.privacyStrikes + 2 * privacyMultiplier
    );
    state.privacy.refusalCount = clampCondition(
      state.privacy.refusalCount + 1 * privacyMultiplier
    );
  }

  if (relationshipProbe && previousTopic === RELATIONSHIP_TOPIC) {
    state.relationship.boundaryPressure = clampRelationship(
      state.relationship.boundaryPressure + 2 * privacyMultiplier
    );
    state.privacy.privacyStrikes = clampCondition(
      state.privacy.privacyStrikes + 1 * privacyMultiplier
    );
  }

  if (lateNight) {
    state.schedule.sleepDisturbCount += 1;
    state.schedule.lastSleepDisturbAt = now.toISOString();
    state.condition.fatigue = clampCondition(state.condition.fatigue + 10);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance + 2);
  }

  if (vulnerable && !privacyLevel && !relationshipProbe) {
    state.relationship.trust = clampRelationship(state.relationship.trust + 2);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance - 1);
  }

  if (friendly && !offensive) {
    state.relationship.trust = clampRelationship(state.relationship.trust + 1);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance - 1);
  }

  const qualifiesAsNormalChat = !offensive && !privacyLevel && !relationshipProbe && !lateNight;
  if (qualifiesAsNormalChat && state.conversation.turnCount % 4 === 0) {
    state.relationship.familiarity = clampRelationship(state.relationship.familiarity + 1);
    state.relationship.trust = clampRelationship(state.relationship.trust + 1);
  }

  if (previousTopic === RELATIONSHIP_TOPIC && nextTopic && nextTopic !== RELATIONSHIP_TOPIC) {
    state.relationship.boundaryPressure = clampRelationship(state.relationship.boundaryPressure - 2);
  }

  state.conversation.lastUserMessageText = normalizedText || null;
  state.condition.irritability = clampCondition(
    RELATIONSHIP_BASE_IRRITABILITY + state.relationship.annoyance * 5 + state.relationship.offense * 5
  );
  state.derived = buildDerived(state);

  return state;
}

export function applyAssistantReplyToSessionState(sessionState, reply, now = new Date()) {
  const state = applySessionDecay(sessionState, now);
  state.conversation.lastAssistantMessageAt = now.toISOString();

  if (/不能|不会|拒绝|不谈/i.test(reply)) {
    state.privacy.refusalCount = clampCondition(state.privacy.refusalCount + 1);
  }

  state.derived = buildDerived(state);
  return state;
}

export function buildSessionStatePrompt(state) {
  const snapshot = applySessionDecay(state, new Date());
  const summary = {
    mood: snapshot.derived.mood,
    availability: snapshot.derived.availability,
    toneBias: snapshot.derived.toneBias,
    trust: snapshot.relationship.trust,
    familiarity: snapshot.relationship.familiarity,
    annoyance: snapshot.relationship.annoyance,
    offense: snapshot.relationship.offense,
    boundaryPressure: snapshot.relationship.boundaryPressure,
    fatigue: snapshot.condition.fatigue,
    busyness: snapshot.condition.busyness,
    currentTopic: snapshot.conversation.currentTopic,
    privacyStrikes: snapshot.privacy.privacyStrikes,
    refusalCount: snapshot.privacy.refusalCount
  };

  return `当前 session state 仅供你作为语气、边界与可接近度参考，不要直接复述数值：${JSON.stringify(summary)}`;
}

export function getLockedReply(sessionState) {
  if (!isSessionLocked(sessionState)) {
    return null;
  }

  return `当前会话已锁定，锁定到 ${sessionState.lock.lockedUntil}。如需恢复，请使用 /debug unlock`;
}
