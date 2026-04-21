const CONDITION_MAX = 100;
const RELATIONSHIP_BASE_IRRITABILITY = 10;
const RELATIONSHIP_TOPIC = "ludwig_relationship";

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clampCondition(value) {
  return clamp(value, 0, CONDITION_MAX);
}

// 根据relationship里的annoyance offense同步condition里的irritability
export function syncIrritabilityFromRelationship(state) {
  state.condition.irritability = clampCondition(
    RELATIONSHIP_BASE_IRRITABILITY + state.relationship.annoyance * 5 + state.relationship.offense * 5
  );

  return state;
}

// 通用评分函数 计算当前condition与某个目标情绪模板的接近程度
function scoreMoodTarget(condition, target, weights) {
  return Object.entries(target).reduce((score, [key, value]) => {
    const weight = weights[key] ?? 0;
    const distance = Math.abs((condition[key] ?? 0) - value);
    return score - distance * weight;
  }, 100);
}

// 从state推导出情绪标签
export function resolveMood(state) {
  const condition = state.condition || {};
  const relationship = state.relationship || {};

  if ((condition.health ?? 0) <= 18) {
    return "unwell";
  }

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

  if (relationship.trust < 8 || relationship.familiarity < 6 || relationship.annoyance > 0) scores.happy -= 16;
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
  if ((relationship.offense ?? 0) >= 7 || (relationship.annoyance ?? 0) >= 7) scores.irritated += 22;
  if ((relationship.boundaryPressure ?? 0) >= 6) {
    scores.cold += 20;
    scores.warm -= 12;
    scores.happy -= 12;
  }
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

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

// 集中生成派生状态 derived 的 mood 和 availability
export function buildDerived(state) {
  const { lock, derived } = state;
  const mood = resolveMood(state);
  let availability = derived?.availability || "limited";
  if (lock.lockedUntil) availability = "unavailable";
  return { mood, availability };
}
