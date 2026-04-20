import { formatUtc8Timestamp } from "../../utils/time.js";

const RELATIONSHIP_TOPIC = "ludwig_relationship";

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

// 理性防御state的默认结构 让session state为后续扩展留稳定入口
export function buildDefaultRationalDefense() {
  return {
    level: 20,
    dominantMode: "measured",
    suppressionStrength: 30,
    vigilance: 20,
    contradictionLoad: 10,
    lastTrigger: null,
    lastShiftAt: null
  };
}

// 将relationship privacy conversation等压力源汇总成理性防御快照
export function evaluateRationalDefense(state, now = new Date()) {
  const previous = state.rationalDefense || buildDefaultRationalDefense();
  const relationship = state.relationship || {};
  const condition = state.condition || {};
  const privacy = state.privacy || {};
  const conversation = state.conversation || {};
  const counterpartIdentity = relationship.currentCounterpart || null;
  const isPrivateLudwig = counterpartIdentity === "Ludwig" && relationship.trust >= 6 && relationship.offense <= 3;

  const vigilance = clamp(
    relationship.boundaryPressure * 10 +
      privacy.privacyStrikes * 8 +
      privacy.refusalCount * 8 +
      conversation.sensitiveTopicCount * 3 +
      relationship.offense * 4
  );
  const suppressionStrength = clamp(
    20 +
      relationship.boundaryPressure * 7 +
      relationship.annoyance * 4 +
      Math.max(0, (condition.busyness ?? 0) - 45) * 0.4 +
      Math.max(0, (condition.fatigue ?? 0) - 45) * 0.35
  );
  const contradictionLoad = clamp(
    relationship.trust * 6 +
      relationship.familiarity * 4 +
      relationship.boundaryPressure * 5 +
      relationship.annoyance * 3 +
      (conversation.currentTopic === RELATIONSHIP_TOPIC ? 18 : 0)
  );
  const level = clamp((vigilance * 0.45) + (suppressionStrength * 0.4) + (contradictionLoad * 0.25) - 10);

  let dominantMode = "measured";
  let lastTrigger = previous.lastTrigger || null;

  if (isPrivateLudwig) {
    dominantMode = "private_softening";
    lastTrigger = conversation.currentTopic === RELATIONSHIP_TOPIC ? "ludwig_relationship" : "ludwig_presence";
  } else if ((privacy.refusalCount ?? 0) >= 2 || (relationship.offense ?? 0) >= 6) {
    dominantMode = "cold_control";
    lastTrigger = "hostility";
  } else if ((privacy.privacyStrikes ?? 0) >= 2 || (relationship.boundaryPressure ?? 0) >= 5) {
    dominantMode = "distance";
    lastTrigger = "boundary_pressure";
  } else if ((condition.fatigue ?? 0) >= 70 || (condition.health ?? 0) <= 35) {
    dominantMode = "self_suppress";
    lastTrigger = "exhaustion";
  } else if (conversation.currentTopic === RELATIONSHIP_TOPIC) {
    dominantMode = "intellectualize";
    lastTrigger = "relationship_topic";
  }

  return {
    level,
    dominantMode,
    suppressionStrength,
    vigilance,
    contradictionLoad,
    lastTrigger,
    lastShiftAt:
      previous.dominantMode === dominantMode && previous.lastShiftAt
        ? previous.lastShiftAt
        : formatUtc8Timestamp(now)
  };
}
