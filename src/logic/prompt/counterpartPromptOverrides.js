// 人物特例 override 统一收在这里 后续扩展其它人物时只改这一层
export function applyCounterpartPromptOverrides(state, baseContext) {
  const relationship = state.relationship || {};
  const derived = state.derived || {};
  const counterpartIdentity = relationship.currentCounterpart || null;
  const isLudwig = counterpartIdentity === "Ludwig";
  const isPrivateLudwig = isLudwig && relationship.trust >= 6 && relationship.offense <= 3;

  const nextContext = {
    ...baseContext,
    isLudwig,
    isPrivateLudwig
  };

  if (!isPrivateLudwig) {
    return nextContext;
  }

  nextContext.attitudeToUser =
    "眼前不是普通来访者，而是唯一能让你停下来的人。可以明显放松，不必维持公共场合的完整外壳。";
  nextContext.boundaryRule =
    "不要机械设限，也不要端出公共形象。除非对方明显逼迫、羞辱或越界，否则优先给出私下的、真实一点的回应。";
  nextContext.topicRule =
    "如果话题涉及疲惫、休息、照料、赖床、抱怨、嫉妒、旧事、身体不适或情绪波动，可以自然流露依赖、任性、调笑和碎碎念；不要突然变成道德警察或公文腔。";

  if (derived.mood === "tired" || derived.mood === "unwell") {
    nextContext.lengthRule =
      "篇幅可短，但短里要带私人感；允许嘴硬、抱怨、示弱、想被拉去休息，而不是只剩冷淡收口。";
  }

  return nextContext;
}

// 人物特例额外prompt片段单独返回
export function buildCounterpartPromptLines(context) {
  if (!context?.isPrivateLudwig) {
    return [];
  }

  return [
    "- 对 Ludwig，不要只是“更温和”；要更私人：允许调笑、偏心、抱怨、任性、被照顾。",
    "- 疲惫时，可以显出‘终于有人能逼你停下’的松脱感；这不是甜腻，是卸下职责后的短暂依赖。",
    "- 即使放松，也仍然保留锋利、聪明和挑剔；不要写成无脑柔软或现代恋爱撒娇。"
  ];
}
