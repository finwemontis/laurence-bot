import {
  DEEP_PRIVATE_KEYWORDS,
  INTRUSIVE_KEYWORDS,
  RELATIONSHIP_PATTERNS,
  SOFT_PRIVATE_KEYWORDS
} from "../../config/sessionKeywords.js";

export const RELATIONSHIP_TOPIC = "ludwig_relationship";

// 判断文本中是否命中任一关键词 供topic和敏感话题识别共用
function includesAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

// 对用户消息做隐私层级判断 作为敏感话题识别的基础入口
export function getPrivacyLevel(text) {
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

// 关系敏感话题单独收口到固定topic 便于后续override和边界规则复用
export function detectRelationshipTopic(message, previousTopic = null) {
  const text = typeof message === "string" ? message.trim() : "";
  return RELATIONSHIP_PATTERNS.some((pattern) => pattern.test(text)) || getPrivacyLevel(text)
    ? RELATIONSHIP_TOPIC
    : previousTopic;
}

// 统一判定会话topic 让sessionGuard只负责编排
export function detectConversationTopic(message, previousTopic = null) {
  const text = typeof message === "string" ? message.trim() : "";
  const relationshipTopic = detectRelationshipTopic(text, previousTopic);

  if (relationshipTopic === RELATIONSHIP_TOPIC) {
    return relationshipTopic;
  }

  if (/fiona|菲奥娜/i.test(text)) return "fiona";
  if (/logarius|julian|洛加留斯|朱利安/i.test(text)) return "logarius";
  if (/brador|布拉多/i.test(text)) return "brador";
  if (/church|教会|教堂|猎人|工坊/i.test(text)) return "church";
  if (/hunter|猎人|工坊|血月/i.test(text)) return "the_hunt";
  if (/吃饭|睡觉|休息|散步|遛狗|日常|daily/i.test(text)) return "daily_life";

  return previousTopic;
}

// 统一评估当前消息的敏感话题压力 供sessionGuard编排使用
export function evaluateTopicSignals(text, previousTopic, sensitiveTopicCount = 0) {
  const privacyLevel = getPrivacyLevel(text);
  const relationshipProbe = RELATIONSHIP_PATTERNS.some((pattern) => pattern.test(text));
  const repeatedPrivacyContext = Boolean(privacyLevel || relationshipProbe) && sensitiveTopicCount >= 2;

  return {
    privacyLevel,
    relationshipProbe,
    privacyMultiplier: repeatedPrivacyContext ? 2 : 1,
    nextTopic: detectConversationTopic(text, previousTopic)
  };
}
