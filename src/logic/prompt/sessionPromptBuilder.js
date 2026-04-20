import { buildRationalPromptContext, buildRationalPromptLines } from "./rationalPromptBuilder.js";
import { finalizeSessionState } from "../state/sessionGuard.js";

// 将state翻译成prompt 控制本回合语气 态度 边界
export function buildSessionStatePrompt(state) {
  const snapshot = finalizeSessionState(state, new Date());
  const { derived, conversation, schedule } = snapshot;
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
    excited: "语气可以带一点压住的愉快，但不要外放过头",
    warm: "语气温一点，但仍要稳，不要像热情接待",
    neutral: "语气自然、简洁、平稳",
    cool: "语气偏冷，少解释，保持距离",
    sharp: "语气可以更锋利，但不要失控，不要变成纯发泄"
  };

  const { attitudeToUser, boundaryRule, lengthRule, topicRule } = buildRationalPromptContext(snapshot);
  const rationalPromptLines = buildRationalPromptLines(snapshot);
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
    ...rationalPromptLines,
    "- 不要模板化寒暄，不要自报身份，不要使用客服式接待语。",
    "- 先回答眼前问题，再决定是否补充一句态度或判断；不要把回复写成说明书。",
    "- 即使给温度，也要克制、稀薄、像本人压着情绪说出来，而不是热情外露。",
    "- 若需要拒绝或收口，措辞可以冷，但要像角色本人在设边界，不要像系统提示。"
  ].filter(Boolean).join("\n");
}
