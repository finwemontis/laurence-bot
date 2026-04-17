import { buildSessionStatePrompt } from "../logic/sessionGuard.js";
import { RELATIONSHIP_PATTERNS } from "../config/sessionKeywords.js";

function sanitizeHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
    )
    .slice(-20)
    .map(({ role, content }) => ({ role, content }));
}

function buildOpeningGuard(history) {
  if (history.length > 0) {
    return [];
  }

  return [
    {
      role: "system",
      content:
        "这是对话的第一轮。不要做模板化自我介绍，不要说自己是司事、执事、普通神父、接待人员，不要说“有什么可以为您效劳吗”。第一句应简短、克制、自然，像Laurence本人在看着来人开口。"
    }
  ];
}

function shouldIncludeLudwigRelation(message, sessionState) {
  const relationshipTopic = sessionState?.conversation?.currentTopic === "ludwig_relationship";
  const relationshipKeyword = typeof message === "string" && RELATIONSHIP_PATTERNS.some((pattern) => pattern.test(message));

  return relationshipKeyword || relationshipTopic;
}

export function buildPrompt({ message, history = [], lore, sessionState = null }) {
  const sanitizedHistory = sanitizeHistory(history);
  const openingGuard = buildOpeningGuard(sanitizedHistory);
  const sessionStatePrompt = sessionState
    ? [{ role: "system", content: buildSessionStatePrompt(sessionState) }]
    : [];
  const ludwigRelationPrompt = shouldIncludeLudwigRelation(message, sessionState)
    ? [{ role: "system", content: lore.ludwigRelation }]
    : [];

  const messages = [
    { role: "system", content: lore.promptCore },
    { role: "system", content: lore.laurenceCard },
    ...ludwigRelationPrompt,
    ...sessionStatePrompt,
    ...openingGuard,
    ...sanitizedHistory,
    { role: "user", content: message }
  ];

  return {
    messages,
    sanitizedHistory
  };
}