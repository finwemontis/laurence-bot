import { formatUtc8Timestamp } from "../../utils/time.js";

const TIME_ZONE = "Asia/Shanghai";

// 标准化文本 去空格标点转小写并截短 会写在state日志和session state保存文件中
export function normalizeMessageText(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .slice(0, 40);
}

// 判断是不是特别短的单个短语
export function isShortSinglePhrase(text) {
  const normalized = normalizeMessageText(text);
  return normalized.length > 0 && normalized.length <= 4;
}

// 解析时间为当地时间 供深夜判断和睡眠打搅清零共用
export function getLocalParts(date, timeZone = TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
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

// 判断当前是否属于深夜时段
export function isLateNight(date, timeZone = TIME_ZONE) {
  const local = getLocalParts(date, timeZone);
  return local.hour >= 0 && local.hour < 5;
}

// 判断是否应在清晨把睡眠打搅计数清零
export function shouldResetSleepDisturb(now, lastDisturbAt, timeZone = TIME_ZONE) {
  if (!lastDisturbAt) {
    return false;
  }

  const nowLocal = getLocalParts(now, timeZone);
  const disturbLocal = getLocalParts(lastDisturbAt, timeZone);
  return nowLocal.hour >= 6 && (disturbLocal.dateKey !== nowLocal.dateKey || disturbLocal.hour < 6);
}

// 休息时被打扰的状态更新统一放这里 
export function applyRestDisturbance(state, now = new Date()) {
  state.schedule.lastSleepDisturbAt = formatUtc8Timestamp(now);

  if (state.schedule.sleepDisturbCount === 0) {
    state.relationship.annoyance = 5;
    state.relationship.boundaryPressure = 3;
  } else {
    state.relationship.annoyance += 1;
  }

  state.schedule.sleepDisturbCount += 1;
  return state;
}
