import { buildDefaultRationalDefense } from "../guards/rationalGuard.js";
import {
  applyCounterpartPromptOverrides,
  buildCounterpartPromptLines
} from "./counterpartPromptOverrides.js";

const RELATIONSHIP_TOPIC = "ludwig_relationship";

// 基于理性防御和关系状态生成本回合的核心行为约束 再交给人物特例做覆盖
export function buildRationalPromptContext(state) {
  const relationship = state.relationship || {};
  const condition = state.condition || {};
  const conversation = state.conversation || {};
  const privacy = state.privacy || {};
  const derived = state.derived || {};
  const rationalDefense = state.rationalDefense || buildDefaultRationalDefense();

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
  if (
    derived.availability === "rest" ||
    derived.availability === "unavailable" ||
    condition.fatigue >= 70 ||
    derived.mood === "unwell"
  ) {
    lengthRule = "篇幅要明显变短，能一句说完就不要说两句。";
  }

  let topicRule = "先回应眼前问题，再决定是否补一句态度。";
  if (conversation.currentTopic === RELATIONSHIP_TOPIC) {
    topicRule = "当前话题与关系边界相关，不要给出会推动关系表白、私密确认或情感摊开的表达。";
  } else if (conversation.currentTopic === "daily_life") {
    topicRule = "可以保留一点生活感，但仍然要像本人，不要变得闲聊式过度热络。";
  } else if (conversation.offensiveCount >= 2) {
    topicRule = "对方已有冒犯趋势，优先压低情绪，减少解释，必要时直接终止该话题。";
  }

  return applyCounterpartPromptOverrides(state, {
    attitudeToUser,
    boundaryRule,
    lengthRule,
    topicRule,
    rationalDefense,
    isLudwig: false,
    isPrivateLudwig: false
  });
}

// 把理性防御机制额外翻译成prompt片段 再拼上人物特例片段
export function buildRationalPromptLines(state) {
  const context = buildRationalPromptContext(state);
  const { rationalDefense } = context;
  const modeDescriptions = {
    measured: "理性防御处于常态，保持克制和分寸。",
    distance: "理性防御偏向疏离与回避，优先维持边界。",
    intellectualize: "理性防御偏向抽象化与讲道理，容易把情绪包装成分析。",
    cold_control: "理性防御偏向冷处理和控制，允许更锋利但不要失控。",
    self_suppress: "理性防御偏向自我压抑，即使疲惫也先收住情绪。",
    private_softening: "理性防御对特定对象暂时松动，允许私人感浮上来，但仍保留锋利和节制。"
  };

  return [
    `- 理性防御：${modeDescriptions[rationalDefense.dominantMode] || "保持理性和节制。"}`,
    rationalDefense.level >= 60 ? "- 当前防御强度较高，优先稳住姿态，再决定是否显露真实情绪。" : null,
    rationalDefense.contradictionLoad >= 45
      ? "- 当前内在矛盾较强，允许出现压着的迟疑、转折或嘴硬，但不要失去角色控制力。"
      : null,
    ...buildCounterpartPromptLines(context)
  ].filter(Boolean);
}
