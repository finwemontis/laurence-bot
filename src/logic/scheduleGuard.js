import { scheduleConfig } from "../config/scheduleConfig.js";

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getLocalParts(date, timeZone = scheduleConfig.timezone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.filter((item) => item.type !== "literal").map((item) => [item.type, item.value]));

  return {
    weekday: String(map.weekday || "").toLowerCase(),
    dateKey: `${map.year}-${map.month}-${map.day}`,
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

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function normalizeWeight(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

function pickWeightedEntry(entries, seed) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      selectedEntry: null,
      selectedIndex: null
    };
  }

  const weightedEntries = entries.map((entry, index) => ({
    entry,
    index,
    weight: normalizeWeight(entry?.weight)
  }));
  const totalWeight = weightedEntries.reduce((sum, item) => sum + item.weight, 0);
  let cursor = hashString(seed) % totalWeight;

  for (const item of weightedEntries) {
    if (cursor < item.weight) {
      return {
        selectedEntry: item.entry,
        selectedIndex: item.index
      };
    }

    cursor -= item.weight;
  }

  const fallback = weightedEntries[weightedEntries.length - 1];
  return {
    selectedEntry: fallback.entry,
    selectedIndex: fallback.index
  };
}

function pickBlockMode(block, sessionState, local) {
  if (!Array.isArray(block?.modes) || block.modes.length === 0) {
    return {
      selectedMode: null,
      selectedModeIndex: null
    };
  }

  const sessionId = sessionState?.sessionId || "session";
  const seed = `${sessionId}:${local.dateKey}:${block.start}-${block.end}:${block.type}:mode`;
  const { selectedEntry, selectedIndex } = pickWeightedEntry(block.modes, seed);

  return {
    selectedMode: selectedEntry,
    selectedModeIndex: selectedIndex
  };
}

function pickModeItem(block, selectedMode, selectedModeIndex, sessionState, local) {
  if (!Array.isArray(selectedMode?.items) || selectedMode.items.length === 0) {
    return {
      selectedItem: null,
      selectedItemIndex: null
    };
  }

  const sessionId = sessionState?.sessionId || "session";
  const modeKey = selectedMode?.name || selectedMode?.label || selectedModeIndex || "mode";
  const seed = `${sessionId}:${local.dateKey}:${block.start}-${block.end}:${block.type}:${modeKey}:item`;
  const { selectedEntry, selectedIndex } = pickWeightedEntry(selectedMode.items, seed);

  return {
    selectedItem: selectedEntry,
    selectedItemIndex: selectedIndex
  };
}

function normalizeDetails(details) {
  if (Array.isArray(details)) {
    return details.filter(Boolean);
  }

  return details || null;
}

function buildCurrentBlock(activeBlock, selectedMode, selectedModeIndex, selectedItem, selectedItemIndex, local) {
  if (!activeBlock) {
    return null;
  }

  const details = normalizeDetails(selectedItem?.details ?? null);
  const location = selectedItem?.location ?? selectedMode?.location ?? activeBlock.location ?? null;
  const condition = activeBlock.condition ? { ...activeBlock.condition } : null;

  return {
    blockKey: `${local.dateKey}:${activeBlock.start}-${activeBlock.end}:${activeBlock.type}`,
    weekday: local.weekday,
    dateKey: local.dateKey,
    start: activeBlock.start,
    end: activeBlock.end,
    crossesMidnight: Boolean(activeBlock.crossesMidnight),
    type: activeBlock.type,
    label: activeBlock.label || activeBlock.type,
    availability: activeBlock.availability || "limited",
    condition,
    location,
    details,
    modeName: selectedMode?.name || null,
    modeLabel: selectedMode?.label || null,
    modeIndex: selectedModeIndex,
    itemLabel: selectedItem?.label || null,
    itemIndex: selectedItemIndex
  };
}

export function resolveScheduleState(sessionState = null, now = new Date()) {
  const local = getLocalParts(now);
  const daySchedule = getDaySchedule(local.weekday);
  const activeBlock = daySchedule ? findActiveBlock(daySchedule.blocks, local.minutes) : null;
  const { selectedMode, selectedModeIndex } = pickBlockMode(activeBlock, sessionState, local);
  const { selectedItem, selectedItemIndex } = pickModeItem(
    activeBlock,
    selectedMode,
    selectedModeIndex,
    sessionState,
    local
  );
  const currentBlock = buildCurrentBlock(
    activeBlock,
    selectedMode,
    selectedModeIndex,
    selectedItem,
    selectedItemIndex,
    local
  );

  return {
    weekday: local.weekday,
    dateKey: local.dateKey,
    activeBlock,
    currentBlock,
    mode: activeBlock?.type || "working",
    availability: activeBlock?.availability || "limited",
    condition:
      activeBlock?.condition ||
      getFallbackCondition(activeBlock?.type || "working", activeBlock?.availability || "limited")
  };
}

export function applyScheduleToSessionState(sessionState, now = new Date()) {
  const state = JSON.parse(JSON.stringify(sessionState));
  const scheduleState = resolveScheduleState(state, now);
  const currentCondition = state.condition || {};
  const scheduleCondition = scheduleState.condition || {};

  state.schedule.mode = scheduleState.mode;
  state.schedule.currentBlock = scheduleState.currentBlock;
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