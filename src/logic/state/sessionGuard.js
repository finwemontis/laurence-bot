// import作息时间表
import { applyScheduleToSessionState } from "../schedule/scheduleGuard.js";
// import时间工具
import { formatUtc8Timestamp } from "../../utils/time.js";
// import关键词模式配置
import {
  BASE_OFFENSE_PATTERNS,
  FRIENDLY_KEYWORDS,
  OFFENSIVE_KEYWORDS,
  VULNERABLE_PATTERNS
} from "../../config/sessionKeywords.js";
import { buildDerived, syncIrritabilityFromRelationship } from "./derivedState.js";
import { applyPrivacyAndRelationshipState } from "../guards/privacyGuard.js";
import { applyRelationshipStateAdjustments } from "../guards/relationshipGuard.js";
import { evaluateRationalDefense } from "../guards/rationalGuard.js";
import {
  applyRestDisturbance,
  isLateNight,
  isShortSinglePhrase,
  normalizeMessageText,
  shouldResetSleepDisturb
} from "../conversation/conversationUtils.js";
import { evaluateTopicSignals } from "../conversation/topicGuard.js";

// 1. 一些常量
// 数值
// 与用户关系state值上限
const RELATIONSHIP_MAX = 10;
// laurence自身状态state值上限
const CONDITION_MAX = 100;

// 合并基础冒犯模式和冒犯关键词 统一生成 冒犯检测规则
const OFFENSE_PATTERNS = [
  ...BASE_OFFENSE_PATTERNS,
  ...OFFENSIVE_KEYWORDS.map((keyword) => new RegExp(keyword, "i"))
];

// 2. 一些工具函数
// 2.1 防数值越界剪裁函数
function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clampRelationship(value) {
  return clamp(value, 0, RELATIONSHIP_MAX);
}

function clampCondition(value) {
  return clamp(value, 0, CONDITION_MAX);
}

// 2.2 消息文本处理
// 判断文本中有无任何关键词
function includesAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

// 5. 深拷贝当前state 避免原地修改
function cloneSessionState(sessionState) {
  return JSON.parse(JSON.stringify(sessionState));
}

// 6. state收尾: schedule derived rationalDefense都在这里集中收口
export function finalizeSessionState(sessionState, now = new Date()) {
  const state = applyScheduleToSessionState(syncIrritabilityFromRelationship(cloneSessionState(sessionState)), now);
  state.rationalDefense = evaluateRationalDefense(state, now);
  state.derived = buildDerived(state);
  return state;
}

// 7. 时间流逝的数值自然衰减
export function applySessionDecay(sessionState, now = new Date()) {
  const state = cloneSessionState(sessionState);
  const previous = new Date(state.meta.updatedAt || state.meta.createdAt || formatUtc8Timestamp(now));
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

  const lastDisturbAt = state.schedule.lastSleepDisturbAt ? new Date(state.schedule.lastSleepDisturbAt) : null;

  if (shouldResetSleepDisturb(now, lastDisturbAt)) {
    state.schedule.sleepDisturbCount = 0;
  }

  return state;
}

// 8. 根据用户message决定state
export function applyUserMessageToSessionState(sessionState, message, now = new Date()) {
  const state = cloneSessionState(sessionState);
  const text = message.trim();
  const normalizedText = normalizeMessageText(text);
  const previousTopic = state.conversation.currentTopic;
  const offensive = OFFENSE_PATTERNS.some((pattern) => pattern.test(text));
  const vulnerable = VULNERABLE_PATTERNS.some((pattern) => pattern.test(text));
  const friendly = includesAnyKeyword(text, FRIENDLY_KEYWORDS);
  const lateNight = isLateNight(now);
  const repeatedShortMessage =
    isShortSinglePhrase(text) &&
    normalizedText.length > 0 &&
    normalizedText === state.conversation.lastUserMessageText;
  const restRequest = state.derived.availability === "rest";
  const { privacyLevel, relationshipProbe, privacyMultiplier, nextTopic } = evaluateTopicSignals(
    text,
    previousTopic,
    state.conversation.sensitiveTopicCount
  );
  const repeatedOffenseContext = offensive && state.conversation.offensiveCount >= 2;
  const offenseMultiplier = repeatedOffenseContext ? 2 : 1;

  state.conversation.turnCount += 1;
  state.conversation.lastUserMessageAt = formatUtc8Timestamp(now);
  state.conversation.currentTopic = nextTopic;

  if (restRequest) {
    applyRestDisturbance(state, now);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance);
    state.relationship.boundaryPressure = clampRelationship(state.relationship.boundaryPressure);
  }

  applyPrivacyAndRelationshipState(state, {
    previousTopic,
    nextTopic,
    privacyLevel,
    relationshipProbe,
    privacyMultiplier,
    vulnerable,
    friendly,
    offensive,
    lateNight
  });
  applyRelationshipStateAdjustments(state, {
    offensive,
    offenseMultiplier,
    repeatedShortMessage,
    vulnerable,
    friendly,
    privacyLevel,
    relationshipProbe,
    lateNight
  });

  state.conversation.lastUserMessageText = normalizedText || null;
  return finalizeSessionState(state, now);
}

// 9. Laurence回复后更新会话状态 主要记录回复时间和拒绝次数
export function applyAssistantReplyToSessionState(sessionState, reply, now = new Date()) {
  const state = cloneSessionState(sessionState);
  state.conversation.lastAssistantMessageAt = formatUtc8Timestamp(now);

  if (/不能|不会|拒绝|不谈/i.test(reply)) {
    state.privacy.refusalCount = clampCondition(state.privacy.refusalCount + 1);
  }

  return finalizeSessionState(state, now);
}

// 10. 如果当前会话仍处于锁定时间内则返回固定锁定回复 否则返回 null
export function getLockedReply(sessionState, now = new Date()) {
  const lockedUntil = sessionState?.lock?.lockedUntil;
  if (!lockedUntil || new Date(lockedUntil).getTime() <= now.getTime()) {
    return null;
  }

  return `当前会话已锁定，锁定到 ${lockedUntil}。如需恢复，请使用 /debug unlock`;
}
