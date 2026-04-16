import { ensureMessageTimestamps, exportHistory } from "../services/historyService.js";
import {
  readActiveLockMessage,
  readActiveSessionState,
  resetSessionState,
  snapshotSessionState,
  updateSessionState
} from "./stateService.js";
import { formatUtc8Timestamp } from "../utils/time.js";

function parseLockDuration(input) {
  const match = /^([0-9]+)([mh])$/i.exec((input || "").trim());

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const minutes = unit === "h" ? amount * 60 : amount;

  return minutes > 0 ? minutes : null;
}

export async function handleDebugCommand(message, history = [], sessionId) {
  const trimmed = message.trim();

  if (!trimmed.startsWith("/debug")) {
    return null;
  }

  const safeHistory = ensureMessageTimestamps(history);
  const state = await readActiveSessionState(sessionId);
  const parts = trimmed.split(/\s+/);
  const action = parts[1] || "";
  const arg = parts[2] || "";

  if (action === "export") {
    const result = await exportHistory(state.sessionId, safeHistory);

    return {
      handled: true,
      sessionId: state.sessionId,
      reply: `已导出当前对话到 ${result.filename}`,
      history: safeHistory,
      meta: {
        command: "export",
        filename: result.filename,
        filePath: result.filePath
      }
    };
  }

  if (action === "state") {
    return {
      handled: true,
      sessionId: state.sessionId,
      reply: JSON.stringify(snapshotSessionState(state), null, 2),
      history: safeHistory,
      meta: {
        command: "state",
        state: snapshotSessionState(state)
      }
    };
  }

  if (action === "reset") {
    const nextState = await resetSessionState(state.sessionId);

    return {
      handled: true,
      sessionId: nextState.sessionId,
      reply: "已重置当前会话 history 和 session state，并解除锁定。",
      history: [],
      meta: {
        command: "reset",
        state: snapshotSessionState(nextState)
      }
    };
  }

  if (action === "lock") {
    const minutes = parseLockDuration(arg);

    if (!minutes) {
      return {
        handled: true,
        sessionId: state.sessionId,
        reply: "锁定时长格式无效，请使用例如 /debug lock 10m 或 /debug lock 1h",
        history: safeHistory,
        meta: {
          command: "lock_invalid"
        }
      };
    }

    const nextState = await updateSessionState(state.sessionId, (currentState) => {
      currentState.lock.lockedUntil = formatUtc8Timestamp(new Date(Date.now() + minutes * 60 * 1000));
      currentState.lock.reason = "debug";
      return currentState;
    });

    return {
      handled: true,
      sessionId: nextState.sessionId,
      reply: `已锁定，持续 ${arg}，到 ${nextState.lock.lockedUntil}`,
      history: safeHistory,
      meta: {
        command: "lock",
        state: snapshotSessionState(nextState)
      }
    };
  }

  if (action === "unlock") {
    const nextState = await updateSessionState(state.sessionId, (currentState) => {
      currentState.lock.lockedUntil = null;
      currentState.lock.reason = null;
      return currentState;
    });

    return {
      handled: true,
      sessionId: nextState.sessionId,
      reply: "已解除锁定。",
      history: safeHistory,
      meta: {
        command: "unlock",
        state: snapshotSessionState(nextState)
      }
    };
  }

  return {
    handled: true,
    sessionId: state.sessionId,
    reply: "未知调试命令。可用命令：/debug export、/debug state、/debug reset、/debug lock 10m、/debug unlock",
    history: safeHistory,
    meta: {
      command: "unknown"
    }
  };
}

export async function getActiveLockMessage(sessionId) {
  return readActiveLockMessage(sessionId);
}