import { scheduleConfig } from "../config/scheduleConfig.js";

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getLocalParts(date, timeZone = scheduleConfig.timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.filter((item) => item.type !== "literal").map((item) => [item.type, item.value]));

  return {
    weekday: String(map.weekday || "").toLowerCase(),
    minutes: Number(map.hour) * 60 + Number(map.minute)
  };
}

function getDaySchedule(weekday) {
  const schedules = Object.values(scheduleConfig.weeklySchedule);
  return schedules.find((entry) => entry.days.includes(weekday)) || null;
}

function findActiveBlock(blocks, minutes) {
  for (const block of blocks) {
    const start = timeToMinutes(block.start);
    const end = timeToMinutes(block.end);

    if (block.crossesMidnight) {
      if (minutes >= start || minutes < end) {
        return block;
      }
      continue;
    }

    if (minutes >= start && minutes < end) {
      return block;
    }
  }

  return null;
}

function clampConditionValue(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function getFallbackCondition(mode, availability) {
  if (availability === "rest") {
    return {
      fatigue: 28,
      busyness: 5,
      irritability: 6,
      hunger: 22
    };
  }

  if (availability === "unavailable") {
    return {
      fatigue: 48,
      busyness: 88,
      irritability: 14,
      hunger: 42
    };
  }

  if (availability === "busy") {
    return {
      fatigue: 52,
      busyness: 78,
      irritability: 14,
      hunger: 38
    };
  }

  if (mode === "evening") {
    return {
      fatigue: 44,
      busyness: 24,
      irritability: 8,
      hunger: 26
    };
  }

  return {
    fatigue: 40,
    busyness: 40,
    irritability: 10,
    hunger: 34
  };
}

export function resolveScheduleState(now = new Date()) {
  const local = getLocalParts(now);
  const daySchedule = getDaySchedule(local.weekday);
  const activeBlock = daySchedule ? findActiveBlock(daySchedule.blocks, local.minutes) : null;

  return {
    weekday: local.weekday,
    activeBlock,
    mode: activeBlock?.type || "working",
    availability: activeBlock?.availability || "limited",
    condition:
      activeBlock?.condition ||
      getFallbackCondition(activeBlock?.type || "working", activeBlock?.availability || "limited")
  };
}

export function applyScheduleToSessionState(sessionState, now = new Date()) {
  const state = JSON.parse(JSON.stringify(sessionState));
  const scheduleState = resolveScheduleState(now);
  const currentCondition = state.condition || {};
  const scheduleCondition = scheduleState.condition || {};

  state.schedule.mode = scheduleState.mode;
  state.derived.availability = scheduleState.availability;
  state.condition = {
    ...currentCondition,
    fatigue: clampConditionValue(Math.max(currentCondition.fatigue ?? 0, scheduleCondition.fatigue ?? 0)),
    busyness: clampConditionValue(scheduleCondition.busyness ?? currentCondition.busyness),
    irritability: clampConditionValue(
      Math.max(currentCondition.irritability ?? 0, scheduleCondition.irritability ?? 0)
    ),
    hunger: clampConditionValue(scheduleCondition.hunger ?? currentCondition.hunger),
    health: currentCondition.health
  };

  return state;
}
