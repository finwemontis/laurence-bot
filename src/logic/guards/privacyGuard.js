import { RELATIONSHIP_TOPIC } from "../conversation/topicGuard.js";

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clampRelationship(value) {
  return clamp(value, 0, 10);
}

function clampCounter(value) {
  return clamp(value, 0, 100);
}

// 将关系和隐私压力统一写回state 避免这部分规则继续堆在sessionGuard里
export function applyPrivacyAndRelationshipState(state, context) {
  const {
    previousTopic,
    nextTopic,
    privacyLevel,
    relationshipProbe,
    privacyMultiplier,
    vulnerable,
    friendly,
    offensive,
    lateNight
  } = context;

  if (privacyLevel || relationshipProbe) {
    state.conversation.sensitiveTopicCount += 1;
    state.privacy.lastSensitiveTopic = privacyLevel || RELATIONSHIP_TOPIC;
  }

  if (privacyLevel === "soft_private") {
    state.relationship.boundaryPressure = clampRelationship(
      state.relationship.boundaryPressure + 1 * privacyMultiplier
    );

    if (previousTopic === RELATIONSHIP_TOPIC) {
      state.privacy.privacyStrikes = clampCounter(
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
    state.privacy.privacyStrikes = clampCounter(
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
    state.privacy.privacyStrikes = clampCounter(
      state.privacy.privacyStrikes + 2 * privacyMultiplier
    );
    state.privacy.refusalCount = clampCounter(
      state.privacy.refusalCount + 1 * privacyMultiplier
    );
  }

  if (relationshipProbe && previousTopic === RELATIONSHIP_TOPIC) {
    state.relationship.boundaryPressure = clampRelationship(
      state.relationship.boundaryPressure + 2 * privacyMultiplier
    );
    state.privacy.privacyStrikes = clampCounter(
      state.privacy.privacyStrikes + 1 * privacyMultiplier
    );
  }

  if (lateNight) {
    state.condition.fatigue = clampCounter(state.condition.fatigue + 10);
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

  if (previousTopic === RELATIONSHIP_TOPIC && nextTopic && nextTopic !== RELATIONSHIP_TOPIC) {
    state.relationship.boundaryPressure = clampRelationship(state.relationship.boundaryPressure - 2);
  }

  return state;
}
