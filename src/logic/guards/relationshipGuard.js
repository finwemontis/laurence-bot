function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clampRelationship(value) {
  return clamp(value, 0, 10);
}

// 处理普通关系增减规则 这里只处理非隐私类的日常增减
export function applyRelationshipStateAdjustments(state, context) {
  const {
    offensive,
    offenseMultiplier,
    repeatedShortMessage,
    vulnerable,
    friendly,
    privacyLevel,
    relationshipProbe,
    lateNight
  } = context;

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

  if (vulnerable && !privacyLevel && !relationshipProbe) {
    state.relationship.trust = clampRelationship(state.relationship.trust + 2);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance - 1);
  }

  if (friendly && !offensive) {
    state.relationship.trust = clampRelationship(state.relationship.trust + 1);
    state.relationship.annoyance = clampRelationship(state.relationship.annoyance - 1);
  }

  const NORMAL_CHAT_TRUST_CAP = 8;
  const qualifiesAsNormalChat = !offensive && !privacyLevel && !relationshipProbe && !lateNight;
  if (qualifiesAsNormalChat && state.conversation.turnCount % 5 === 0) {
    state.relationship.familiarity = clampRelationship(state.relationship.familiarity + 1);
    if (state.relationship.trust < NORMAL_CHAT_TRUST_CAP) {
      state.relationship.trust = clampRelationship(state.relationship.trust + 1);
    }
  }

  return state;
}