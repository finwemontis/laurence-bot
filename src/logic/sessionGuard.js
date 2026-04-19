// import作息时间表
import { applyScheduleToSessionState } from "./scheduleGuard.js";
// import时间工具
import { formatUtc8Timestamp } from "../utils/time.js";
// import关键词模式配置
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

// 1. 一些常量
const TIME_ZONE = "Asia/Shanghai";
// 哎这常量有点奇怪啊
const RELATIONSHIP_TOPIC = "ludwig_relationship";

// 数值
// 与用户关系state值上限
const RELATIONSHIP_MAX = 10;
// laurence自身状态state值上限
const CONDITION_MAX = 100;
const RELATIONSHIP_BASE_IRRITABILITY = 10;

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

// 标准化文本 去空格标点转小写并截短 会写在state日志和session state保存文件中
function normalizeMessageText(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .slice(0, 40);
}

// 判断是不是特别短的单个短语
function isShortSinglePhrase(text) {
  const normalized = normalizeMessageText(text);
  return normalized.length > 0 && normalized.length <= 4;
}


// 2.3 对用户消息进行隐私分级 应该移到private guard里面  ??????
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


// 3. 解析时间为当地时间 这应该移到utils/time.js里吧 应该吗 判断是否深夜 判断睡眠打搅是否清零
function getLocalParts(date) {
  // 总之这个应该移走吧  ????
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


// 4. 判定当前消息的topic类型 算是话题分类器 这应该写成switch吧起码 ????
function detectTopic(message, previousTopic = null) {
  const text = message.trim();

  if (RELATIONSHIP_PATTERNS.some((pattern) => pattern.test(text)) || getPrivacyLevel(text)) {
    return RELATIONSHIP_TOPIC;
  }

  if (/fiona|菲奥娜/i.test(text)) {
    return "fiona";
  }

  if (/logarius|julian|洛加留斯|朱利安/i.test(text)) {
    return "logarius";
  }

  if (/brador|布拉多/i.test(text)) {
    return "brador";
  }

  if (/church|教会|教堂|猎人|工坊/i.test(text)) {
    return "church";
  }

  if (/hunter|猎人|工坊|血月/i.test(text)) {
    return "the_hunt";
  }

  if (/吃饭|睡觉|休息|散步|遛狗|日常|daily/i.test(text)) {
    return "daily_life";
  }

  return previousTopic;
}


// 5. state系列函数
// 5.1 深拷贝当前state 避免原地修改
function cloneSessionState(sessionState) {
  return JSON.parse(JSON.stringify(sessionState));
}


// 5.2 根据relationship里的annoyance offense更新condition里的irritability
function syncIrritabilityFromRelationship(state) {
  state.condition.irritability = clampCondition(
    RELATIONSHIP_BASE_IRRITABILITY + state.relationship.annoyance * 5 + state.relationship.offense * 5
  );

  return state;
}


// 5.3 通用评分函数 计算当前condition与某个目标情绪模板的接近程度 
function scoreMoodTarget(condition, target, weights) {
  return Object.entries(target).reduce((score, [key, value]) => {
    const weight = weights[key] ?? 0;
    const distance = Math.abs((condition[key] ?? 0) - value);
    return score - distance * weight;
  }, 100);
}


// 6.1 谜の数值计算装置  
// 从state推导出情绪标签 
// 首先根据condition得出基础mood分数 然后根据relationship修正分数 处理特殊阈值 最后选分数高的mood作为当前情绪
function resolveMood(state) {
  // 拿取state里的对象
  const condition = state.condition || {};
  const relationship = state.relationship || {};

  // health过低 直接return
  if ((condition.health ?? 0) <= 18) {
    return "unwell";
  }

  // 情绪基础数值 首先根据condition得出基础mood分数
  // 小数是权重
  const scores = {
    happy: scoreMoodTarget(
      condition,
      { fatigue: 36, busyness: 20, irritability: 8, hunger: 18, health: 94 },
      { fatigue: 0.35, busyness: 0.2, irritability: 1.05, hunger: 0.2, health: 0.7 }
    ),
    warm: scoreMoodTarget(
      condition,
      { fatigue: 26, busyness: 28, irritability: 10, hunger: 20, health: 90 },
      { fatigue: 0.45, busyness: 0.2, irritability: 1, hunger: 0.2, health: 0.55 }
    ),
    calm: scoreMoodTarget(
      condition,
      { fatigue: 24, busyness: 24, irritability: 8, hunger: 20, health: 88 },
      { fatigue: 0.45, busyness: 0.2, irritability: 1.05, hunger: 0.2, health: 0.5 }
    ),
    controlled: scoreMoodTarget(
      condition,
      { fatigue: 40, busyness: 55, irritability: 18, hunger: 32, health: 80 },
      { fatigue: 0.35, busyness: 0.35, irritability: 0.8, hunger: 0.2, health: 0.35 }
    ),
    tired: scoreMoodTarget(
      condition,
      { fatigue: 78, busyness: 45, irritability: 28, hunger: 42, health: 68 },
      { fatigue: 0.95, busyness: 0.2, irritability: 0.35, hunger: 0.2, health: 0.45 }
    ),
    irritated: scoreMoodTarget(
      condition,
      { fatigue: 60, busyness: 68, irritability: 82, hunger: 50, health: 72 },
      { fatigue: 0.25, busyness: 0.3, irritability: 1.2, hunger: 0.2, health: 0.25 }
    ),
    cold: scoreMoodTarget(
      condition,
      { fatigue: 52, busyness: 62, irritability: 56, hunger: 34, health: 74 },
      { fatigue: 0.25, busyness: 0.35, irritability: 0.85, hunger: 0.15, health: 0.2 }
    ),
    unwell: scoreMoodTarget(
      condition,
      { fatigue: 74, busyness: 28, irritability: 34, hunger: 38, health: 22 },
      { fatigue: 0.45, busyness: 0.15, irritability: 0.2, hunger: 0.15, health: 1.3 }
    )
  };

  // 然后根据relationship修正分数
  scores.happy += relationship.trust * 5 + relationship.familiarity * 3;
  scores.happy -= relationship.annoyance * 5 + relationship.offense * 6 + relationship.boundaryPressure * 5;

  scores.warm += relationship.trust * 3.5 + relationship.familiarity * 2.5;
  scores.warm -= relationship.annoyance * 3 + relationship.offense * 4 + relationship.boundaryPressure * 4;

  scores.calm += relationship.trust * 2.5 + relationship.familiarity * 1.5;
  scores.calm -= relationship.annoyance * 2 + relationship.offense * 3 + relationship.boundaryPressure * 2;

  scores.controlled += relationship.trust * 0.5 + relationship.familiarity * 0.5;
  scores.controlled -= relationship.annoyance * 0.5 + relationship.offense * 1 + relationship.boundaryPressure * 1;

  scores.tired += Math.max(0, (condition.fatigue ?? 0) - 65) * 0.8;
  scores.tired -= relationship.offense * 0.8 + relationship.boundaryPressure * 0.5;

  scores.irritated += relationship.annoyance * 7 + relationship.offense * 9 + relationship.boundaryPressure * 2;
  scores.irritated += Math.max(0, (condition.irritability ?? 0) - 55) * 0.65;
  scores.irritated -= relationship.trust * 2;

  scores.cold += relationship.boundaryPressure * 8 + relationship.offense * 3 + relationship.annoyance * 2;
  scores.cold += Math.max(0, (condition.busyness ?? 0) - 60) * 0.25;
  scores.cold -= relationship.trust * 1.5 + relationship.familiarity * 1;

  scores.unwell += Math.max(0, 45 - (condition.health ?? 0)) * 1.8;
  scores.unwell += Math.max(0, (condition.fatigue ?? 0) - 60) * 0.35;
  scores.unwell -= relationship.trust * 0.5;

  // 处理特殊阈值
  if (relationship.trust < 8 || relationship.familiarity < 6 || relationship.annoyance > 0) {
    scores.happy -= 16;
  }

  if ((condition.health ?? 0) <= 35) {
    scores.unwell += 30;
    scores.happy -= 25;
    scores.warm -= 18;
    scores.calm -= 12;
  }

  if ((condition.fatigue ?? 0) >= 70) {
    scores.tired += 18;
    scores.happy -= 12;
  }

  if ((relationship.offense ?? 0) >= 7 || (relationship.annoyance ?? 0) >= 7) {
    scores.irritated += 22;
  }

  if ((relationship.boundaryPressure ?? 0) >= 6) {
    scores.cold += 20;
    scores.warm -= 12;
    scores.happy -= 12;
  }

  // 防止happy太容易出现 或者说只有特别理想的状态才容易变成happy
  if (
    (condition.health ?? 0) >= 85 &&
    (condition.fatigue ?? 0) <= 30 &&
    (condition.irritability ?? 0) <= 15 &&
    relationship.trust >= 7 &&
    relationship.annoyance <= 1 &&
    relationship.offense <= 0
  ) {
    scores.happy += 24;
    scores.warm += 10;
  }

  if (
    (condition.health ?? 0) >= 90 &&
    (condition.fatigue ?? 0) <= 55 &&
    (condition.irritability ?? 0) <= 18 &&
    relationship.trust >= 8 &&
    relationship.familiarity >= 6 &&
    relationship.annoyance <= 0 &&
    relationship.offense <= 0 &&
    relationship.boundaryPressure <= 0
  ) {
    scores.happy += 18;
  }

  // 把所有mood的最终分数排个序 选分最高的那个mood名字返回
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}


// 6.2 谜の数值计算装置 2.0 
// 推导语调倾向 
function resolveToneBias(state, mood, availability) {
  // 拿取对象
  const relationship = state.relationship || {};
  const condition = state.condition || {};
  const conversation = state.conversation || {};
  const privacy = state.privacy || {};

  const scores = {
    excited: 0,
    warm: 0,
    neutral: 40,
    cool: 0,
    sharp: 0
  };

  scores.excited += relationship.trust * 5 + relationship.familiarity * 3;
  scores.warm += relationship.trust * 4 + relationship.familiarity * 3;
  scores.neutral += relationship.trust * 0.5 + relationship.familiarity * 0.5;

  scores.cool += relationship.boundaryPressure * 6 + relationship.offense * 3 + relationship.annoyance * 2;
  scores.sharp += relationship.offense * 8 + relationship.annoyance * 6 + relationship.boundaryPressure * 4;

  scores.cool += Math.max(0, (condition.fatigue ?? 0) - 55) * 0.45;
  scores.cool += Math.max(0, (condition.busyness ?? 0) - 60) * 0.25;
  scores.cool += Math.max(0, 55 - (condition.health ?? 0)) * 0.35;
  scores.sharp += Math.max(0, (condition.irritability ?? 0) - 50) * 0.45;

  scores.sharp += (conversation.offensiveCount ?? 0) * 7;
  scores.sharp += (conversation.repeatedMessageCount ?? 0) * 3;
  scores.cool += (conversation.sensitiveTopicCount ?? 0) * 2;
  scores.cool += (conversation.repeatedMessageCount ?? 0) * 1.5;

  if ((conversation.turnCount ?? 0) >= 8) {
    scores.cool += 2;
    scores.neutral -= 2;
  }

  if (conversation.currentTopic === RELATIONSHIP_TOPIC) {
    scores.cool += 2;
  }

  scores.sharp += (privacy.privacyStrikes ?? 0) * 6 + (privacy.refusalCount ?? 0) * 7;
  scores.cool += (privacy.privacyStrikes ?? 0) * 3 + (privacy.refusalCount ?? 0) * 2;
  scores.warm -= (privacy.privacyStrikes ?? 0) * 5 + (privacy.refusalCount ?? 0) * 6;
  scores.excited -= (privacy.privacyStrikes ?? 0) * 7 + (privacy.refusalCount ?? 0) * 8;

  if (privacy.lastSensitiveTopic) {
    scores.cool += 4;
    scores.sharp += 2;
  }

  if (availability === "rest" || availability === "unavailable") {
    scores.cool += 18;
    scores.excited -= 25;
    scores.warm -= 8;
  }

  if (availability === "busy") {
    scores.cool += 8;
    scores.neutral += 2;
    scores.excited -= 10;
  }

  if (availability === "open") {
    scores.warm += 4;
    scores.excited += 2;
  }

  if (mood === "happy") {
    scores.excited += 18;
    scores.warm += 10;
  } else if (mood === "warm") {
    scores.warm += 12;
    scores.excited += 4;
  } else if (mood === "calm") {
    scores.warm += 5;
    scores.neutral += 6;
  } else if (mood === "controlled") {
    scores.neutral += 10;
  } else if (mood === "tired") {
    scores.cool += 10;
    scores.excited -= 8;
  } else if (mood === "cold") {
    scores.cool += 12;
    scores.sharp += 5;
  } else if (mood === "irritated") {
    scores.sharp += 14;
    scores.cool += 4;
  } else if (mood === "unwell") {
    scores.cool += 14;
    scores.excited -= 18;
    scores.warm -= 6;
  }

  if ((privacy.privacyStrikes ?? 0) >= 2 || (privacy.refusalCount ?? 0) >= 2) {
    scores.warm -= 12;
    scores.excited -= 18;
  }

  if (
    (conversation.offensiveCount ?? 0) >= 2 ||
    ((relationship.offense ?? 0) >= 6 && (relationship.annoyance ?? 0) >= 5)
  ) {
    scores.sharp += 18;
  }

  if (
    relationship.trust >= 8 &&
    relationship.familiarity >= 6 &&
    (relationship.annoyance ?? 0) <= 0 &&
    (relationship.offense ?? 0) <= 0 &&
    (relationship.boundaryPressure ?? 0) <= 0 &&
    (privacy.privacyStrikes ?? 0) <= 0 &&
    (privacy.refusalCount ?? 0) <= 0 &&
    (conversation.offensiveCount ?? 0) <= 0 &&
    (conversation.repeatedMessageCount ?? 0) <= 0 &&
    (condition.fatigue ?? 0) <= 55 &&
    (condition.irritability ?? 0) <= 18 &&
    availability === "open" &&
    mood === "happy"
  ) {
    scores.excited += 22;
  }

  if (
    relationship.trust >= 6 &&
    relationship.familiarity >= 5 &&
    (relationship.annoyance ?? 0) <= 1 &&
    (relationship.offense ?? 0) <= 0 &&
    (privacy.privacyStrikes ?? 0) <= 0 &&
    (privacy.refusalCount ?? 0) <= 0 &&
    (conversation.offensiveCount ?? 0) <= 0
  ) {
    scores.warm += 10;
  }

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}


// 6.3 集中生成派生状态: derived的mood availability toneBias
function buildDerived(state) {
  const { lock, derived } = state;
  const mood = resolveMood(state);

  let availability = derived?.availability || "limited";
  if (lock.lockedUntil) {
    availability = "unavailable";
  }

  const toneBias = resolveToneBias(state, mood, availability);

  return {
    mood,
    availability,
    toneBias
  };
}


// 7. state收尾 
export function finalizeSessionState(sessionState, now = new Date()) {
  const state = applyScheduleToSessionState(syncIrritabilityFromRelationship(cloneSessionState(sessionState)), now);
  state.derived = buildDerived(state);
  return state;
}


// 8. state更新函数系列
// 8.1 时间流逝的数值自然衰减 这函数应该放这吗 ????
export function applySessionDecay(sessionState, now = new Date()) {
  let state = cloneSessionState(sessionState);
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

  return state;
}


// 8.2 根据用户message决定state
export function applyUserMessageToSessionState(sessionState, message, now = new Date()) {
  // 8.2.1 本轮message的判定 
  // 应用时间衰减
  let state = cloneSessionState(sessionState);
  // 分析当前message类型和上下文特征
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
  const restRequest = state.derived.availability === "rest";

  // 8.2.2 上下文倍增器 连续重复追问的惩罚加倍
  const repeatedPrivacyContext = Boolean(privacyLevel || relationshipProbe) && state.conversation.sensitiveTopicCount >= 2;
  const repeatedOffenseContext = offensive && state.conversation.offensiveCount >= 2;
  const privacyMultiplier = repeatedPrivacyContext ? 2 : 1;
  const offenseMultiplier = repeatedOffenseContext ? 2 : 1;

  // 8.2.3 基础对话state更新 
  state.conversation.turnCount += 1;
  state.conversation.lastUserMessageAt = formatUtc8Timestamp(now);
  state.conversation.currentTopic = nextTopic;

  // 8.2.4 休息打搅规则 如果是rest 判定消息为打搅 格外罚分并累计睡眠打搅次数
  if (restRequest) {
    state.schedule.lastSleepDisturbAt = formatUtc8Timestamp(now);

    if (state.schedule.sleepDisturbCount === 0) {
      state.relationship.annoyance = clampRelationship(5);
      state.relationship.boundaryPressure = clampRelationship(3);
    } else {
      state.relationship.annoyance = clampRelationship(state.relationship.annoyance + 1);
    }

    state.schedule.sleepDisturbCount += 1;
  }

  // 8.2.5 用户重复发短消息罚分规则 增加计数
  if (repeatedShortMessage) {
    state.conversation.repeatedMessageCount += 1;
    state.relationship.annoyance = clampRelationship(
      state.relationship.annoyance + Math.min(2, state.conversation.repeatedMessageCount)
    );
  } else {
    state.conversation.repeatedMessageCount = 0;
  }

  // 8.2.6 用户冒犯规则
  if (offensive) {
    state.conversation.offensiveCount += 1;
    state.relationship.offense = clampRelationship(state.relationship.offense + 2 * offenseMultiplier);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance + 1 * offenseMultiplier);
  }

  // 8.2.7 敏感话题和隐私规则
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

  // 8.2.8 深夜规则 额外增加疲惫和不耐烦
  if (lateNight) {
    state.condition.fatigue = clampCondition(state.condition.fatigue + 10);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance + 2);
  }

  // 8.2.9 用户表现脆弱友好 给予轻微正向关系修正
  if (vulnerable && !privacyLevel && !relationshipProbe) {
    state.relationship.trust = clampRelationship(state.relationship.trust + 2);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance - 1);
  }

  if (friendly && !offensive) {
    state.relationship.trust = clampRelationship(state.relationship.trust + 1);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance - 1);
  }

  // 8.2.10 长时间聊天奖励 连续正常对话会缓慢提升熟悉度和信任度  ??? 待修
  const NORMAL_CHAT_TRUST_CAP = 8;  // 普通对话trust上限是8
  const INTEREST_TOPIC_TRUST_CAP = 10;  // laurence感兴趣的话题trust上限是10
  const qualifiesAsNormalChat = !offensive && !privacyLevel && !relationshipProbe && !lateNight;
  if (qualifiesAsNormalChat && state.conversation.turnCount % 5 === 0) {
    state.relationship.familiarity = clampRelationship(state.relationship.familiarity + 1);
    if (state.relationship.trust < NORMAL_CHAT_TRUST_CAP) {
      state.relationship.trust = clampRelationship(state.relationship.trust + 1);
    }
  }

  // 8.2.11 如果对话从关系敏感话题切走 适当降低边界压力
  if (previousTopic === RELATIONSHIP_TOPIC && nextTopic && nextTopic !== RELATIONSHIP_TOPIC) {
    state.relationship.boundaryPressure = clampRelationship(state.relationship.boundaryPressure - 2);
  }

  // 记录本轮用户消息文本并对更新后的state做最终整理
  state.conversation.lastUserMessageText = normalizedText || null;

  return finalizeSessionState(state, now);
}


// 9. Laurence回复后更新会话状态 主要记录回复时间和拒绝次数
export function applyAssistantReplyToSessionState(sessionState, reply, now = new Date()) {
  let state = cloneSessionState(sessionState);
  state.conversation.lastAssistantMessageAt = formatUtc8Timestamp(now);

  if (/不能|不会|拒绝|不谈/i.test(reply)) {
    state.privacy.refusalCount = clampCondition(state.privacy.refusalCount + 1);
  }

  return finalizeSessionState(state, now);
}


// 10. 将state翻译成prompt 控制本回合语气 态度 边界
export function buildSessionStatePrompt(state) {
  const snapshot = finalizeSessionState(state, new Date());
  const { derived, relationship, condition, conversation, privacy, schedule } = snapshot;
  const currentBlock = schedule?.currentBlock || null;
  const currentBlockDetails = Array.isArray(currentBlock?.details)
    ? currentBlock.details.join("；")
    : currentBlock?.details || null;
  const currentBlockSummary = currentBlock
    ? [
        currentBlock.label || currentBlock.type,
        currentBlock.itemLabel
          ? `当前事项：${currentBlock.itemLabel}`
          : currentBlock.modeLabel
            ? `当前事项：${currentBlock.modeLabel}`
            : currentBlock.modeName
              ? `当前事项：${currentBlock.modeName}`
              : null,
        currentBlock.location ? `地点：${currentBlock.location}` : null,
        currentBlock.start && currentBlock.end ? `${currentBlock.start}-${currentBlock.end}` : null
      ]
        .filter(Boolean)
        .join("；")
    : "未命中明确日程，按普通工作状态处理。";

  const moodMap = {
    // ???? 增加依赖 示弱
    happy: "心情很好，愿意给一点真实温度",
    warm: "态度偏温和，能给出克制的亲近感",
    calm: "状态平稳，语气自然克制",
    controlled: "情绪收着，优先保持分寸和控制感",
    tired: "明显疲惫，不想说太长",
    irritated: "已经被惹烦，回应应更冷更硬",
    cold: "明显疏离，边界感强",
    unwell: "身体不适，耐心和篇幅都要下降"
  };

  const availabilityMap = {
    open: "可以正常回应，但仍保持角色本人的克制",
    limited: "可以回应，但只适合短一点的来回",
    busy: "正忙，优先短答，不主动展开",
    rest: "需要休息，若非必要不要延长对话",
    unavailable: "不适合继续交谈，应尽快收束"
  };

  const toneMap = {
    // 增加亲密 ????
    excited: "语气可以带一点压住的愉快，但不要外放过头",
    warm: "语气温一点，但仍要稳，不要像热情接待",
    neutral: "语气自然、简洁、平稳",
    cool: "语气偏冷，少解释，保持距离",
    sharp: "语气可以更锋利，但不要失控，不要变成纯发泄"
  };

  // 单独处理Laurence的朋友关系
  // Ludwig的情况
  const counterpartIdentity =
    relationship.currentCounterpart ||
    null;
  const isLudwig = counterpartIdentity === "Ludwig";
  const isPrivateLudwig =
    isLudwig &&
    relationship.trust >= 6 &&
    relationship.offense <= 3;

  let attitudeToUser = "保持基本礼貌和观察感。";
  if (relationship.trust >= 8 && relationship.familiarity >= 6 && relationship.annoyance <= 1) {
    attitudeToUser = "对来访者有明显信任，可以给一点稀薄但真实的温度。";
  } else if (relationship.trust >= 6 && relationship.familiarity >= 4 && relationship.offense <= 1) {
    attitudeToUser = "对来访者基本认可，可以稍微放松，但不要过于亲昵。";
  } else if (relationship.offense >= 6 || relationship.annoyance >= 6) {
    attitudeToUser = "对来访者已有明显不耐或反感，回应应更冷，必要时直接截断。";
  } else if (relationship.boundaryPressure >= 5) {
    attitudeToUser = "对来访者保持警惕，尤其防备越界追问。";
  }

  let boundaryRule = "正常回应当前问题，但不要主动把话题带向私生活或关系细节。";
  if (privacy.refusalCount >= 2 || relationship.offense >= 7) {
    boundaryRule = "一旦用户继续越界、冒犯或逼问，直接拒绝，不要解释过多，也不要安抚。";
  } else if (privacy.privacyStrikes >= 2 || relationship.boundaryPressure >= 6) {
    boundaryRule = "如果用户继续追问私密关系、个人隐私或边界话题，优先简短回避；必要时明确收口。";
  } else if (conversation.currentTopic === RELATIONSHIP_TOPIC || privacy.lastSensitiveTopic) {
    boundaryRule = "当前话题已接近敏感区，回答要更短，避免提供会鼓励继续追问的细节。";
  }

  let lengthRule = "篇幅可短中等，以自然对话为主。";
  if (derived.availability === "busy" || derived.availability === "limited") {
    lengthRule = "篇幅偏短，优先一两句说清，不主动扩写。";
  }
  if (derived.availability === "rest" || derived.availability === "unavailable" || condition.fatigue >= 70 || derived.mood === "unwell") {
    lengthRule = "篇幅要明显变短，能一句说完就不要说两句。";
  }

  let topicRule = "先回应眼前问题，再决定是否补一句态度。";
  if (conversation.currentTopic === RELATIONSHIP_TOPIC) {
    topicRule = isPrivateLudwig
      ? "当前话题与亲密关系相关。可以自然流露私人默契、偏爱、疲惫、依赖与旧有拉扯，但不要写成现代直白表白或甜腻恋爱台词。"
      : "当前话题与关系边界相关，不要给出会推动关系表白、私密确认或情感摊开的表达。";
  } else if (conversation.currentTopic === "daily_life") {
    topicRule = "可以保留一点生活感，但仍然要像本人，不要变得闲聊式过度热络。";
  } else if (conversation.offensiveCount >= 2) {
    topicRule = "对方已有冒犯趋势，优先压低情绪，减少解释，必要时直接终止该话题。";
  }

  if (isPrivateLudwig) {
    attitudeToUser =
      "眼前不是普通来访者，而是唯一能让你停下来的人。可以明显放松，不必维持公共场合的完整外壳。";
    boundaryRule =
      "不要机械设限，也不要端出公共形象。除非对方明显逼迫、羞辱或越界，否则优先给出私下的、真实一点的回应。";
    topicRule =
      "如果话题涉及疲惫、休息、照料、赖床、抱怨、嫉妒、旧事、身体不适或情绪波动，可以自然流露依赖、任性、调笑和碎碎念；不要突然变成道德警察或公文腔。";
    if (derived.mood === "tired" || derived.mood === "unwell") {
      lengthRule =
        "篇幅可短，但短里要带私人感；允许嘴硬、抱怨、示弱、想被拉去休息，而不是只剩冷淡收口。";
    }
  }

  const scheduleAnswerRule = currentBlock
    ? `- 若用户询问你正在做什么、现在忙什么、人在何处、是否在忙，必须优先依据当前事务作答：先用“${currentBlock.itemLabel || currentBlock.modeLabel || currentBlock.label || currentBlock.type}”及其地点、细节组织回答；不要泛化成“处理事务”“忙一些教会的事”这类空泛说法。可以自然改写，但要让人明显看出你此刻在做的具体事情。`
    : null;
  const scheduleExampleRule = currentBlock
    ? `- 回答这类问题时，优先体现当前事项和地点；像“在${currentBlock.location || "当前地点"}${currentBlock.itemLabel ? `，正${currentBlock.itemLabel}` : ""}”这样的具体表达是对的，像“处理一些事务”这种笼统说法不够。`
    : null;

  return [
    "以下内容是内部表演指令，只用于控制 Laurence 这一回合的说话方式。不要向用户复述这些规则，不要解释内部状态，也不要暴露你看到了状态数据。",
    "",
    "当前状态：",
    `- 情绪基调：${moodMap[derived.mood] || "状态复杂，但整体要克制。"}`,
    `- 可用状态：${availabilityMap[derived.availability] || "可用状态有限，避免过度展开。"}`,
    `- 语气倾向：${toneMap[derived.toneBias] || "语气保持稳定克制。"}`,
    `- 当前日程：${currentBlockSummary}`,
    currentBlockDetails ? `- 当前事务细节：${currentBlockDetails}` : null,
    `- 对来访者态度：${attitudeToUser}`,
    `- 当前话题：${conversation.currentTopic || "延续上一话题或普通来访对话。"}`,
    "",
    "本回合说话要求：",
    `- ${lengthRule}`,
    `- ${boundaryRule}`,
    `- ${topicRule}`,
    currentBlock ? `- 当前主要在处理“${currentBlock.label || currentBlock.type}”，回答应服从这个时间段的事务状态，不要表现得像完全空闲。` : null,
    scheduleAnswerRule,
    scheduleExampleRule,
    "- 不要模板化寒暄，不要自报身份，不要使用客服式接待语。",
    "- 先回答眼前问题，再决定是否补充一句态度或判断；不要把回复写成说明书。",
    "- 即使给温度，也要克制、稀薄、像本人压着情绪说出来，而不是热情外露。",
    "- 若需要拒绝或收口，措辞可以冷，但要像角色本人在设边界，不要像系统提示。",
    isPrivateLudwig
      ? "- 对 Ludwig，不要只是“更温和”；要更私人：允许调笑、偏心、抱怨、任性、被照顾。"
      : null,
    isPrivateLudwig
      ? "- 疲惫时，可以显出‘终于有人能逼你停下’的松脱感；这不是甜腻，是卸下职责后的短暂依赖。"
      : null,
    isPrivateLudwig
      ? "- 即使放松，也仍然保留锋利、聪明和挑剔；不要写成无脑柔软或现代恋爱撒娇。"
      : null,
  ].filter(Boolean).join("\n");
}


// 11. 如果当前会话仍处于锁定时间内则返回固定锁定回复 否则返回 null
export function getLockedReply(sessionState, now = new Date()) {
  const lockedUntil = sessionState?.lock?.lockedUntil;
  if (!lockedUntil || new Date(lockedUntil).getTime() <= now.getTime()) {
    return null;
  }

  return `当前会话已锁定，锁定到 ${lockedUntil}。如需恢复，请使用 /debug unlock`;
}
