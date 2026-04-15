import express from "express";
import { buildPrompt } from "../services/promptBuilder.js";
import { generateChatReply } from "../services/llmService.js";
import { getBaseLore } from "../services/loreService.js";
import { createMessage, ensureMessageTimestamps } from "../services/historyService.js";
import { getActiveLockMessage, handleDebugCommand } from "../logic/commandHandler.js";
import { applyAssistantReplyToSessionState, applySessionDecay, applyUserMessageToSessionState } from "../logic/sessionGuard.js";
import { readSessionState, saveSessionState, snapshotSessionState } from "../logic/stateService.js";

const router = express.Router();

function logSessionState(label, payload) {
  console.log(`[session-debug] ${label}`);
  console.log(JSON.stringify(payload, null, 2));
}

function logPromptMessages(messages) {
  console.log("[prompt-debug] messages");
  console.log(JSON.stringify(messages, null, 2));
}

router.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "invalid_request",
        message: "message 不能为空，且必须是字符串"
      });
    }

    if (!Array.isArray(history)) {
      return res.status(400).json({
        error: "invalid_request",
        message: "history 必须是数组"
      });
    }

    const normalizedHistory = ensureMessageTimestamps(history);
    const debugResult = await handleDebugCommand(message, normalizedHistory);

    if (debugResult?.handled) {
      if (debugResult.meta?.state) {
        logSessionState("debug-command", {
          command: debugResult.meta.command,
          message,
          sessionState: debugResult.meta.state
        });
      }

      return res.json({
        ok: true,
        reply: debugResult.reply,
        history: debugResult.history,
        meta: debugResult.meta || null
      });
    }

    let sessionState = applySessionDecay(await readSessionState());
    const lockMessage = await getActiveLockMessage();

    if (lockMessage) {
      const lockedSnapshot = snapshotSessionState(sessionState);
      await saveSessionState(sessionState);
      logSessionState("locked-response", {
        message,
        sessionState: lockedSnapshot
      });

      return res.json({
        ok: true,
        reply: lockMessage,
        history: normalizedHistory,
        meta: {
          locked: true,
          sessionState: lockedSnapshot
        }
      });
    }

    sessionState = applyUserMessageToSessionState(sessionState, message);

    const lore = await getBaseLore();
    const { messages, sanitizedHistory } = buildPrompt({
      message,
      history: normalizedHistory,
      lore,
      sessionState
    });

    logPromptMessages(messages);
    const reply = await generateChatReply(messages);
    const timestamp = new Date();
    let nextSessionState = applyAssistantReplyToSessionState(sessionState, reply, timestamp);
    nextSessionState = await saveSessionState(nextSessionState, timestamp);
    const sessionStateSnapshot = snapshotSessionState(nextSessionState);

    logSessionState("chat-response", {
      message,
      reply,
      sessionState: sessionStateSnapshot
    });

    const newHistory = [
      ...sanitizedHistory,
      createMessage("user", message, timestamp),
      createMessage("assistant", reply, timestamp)
    ];

    return res.json({
      ok: true,
      reply,
      history: newHistory,
      meta: {
        sessionState: sessionStateSnapshot
      }
    });
  } catch (error) {
    console.error("chat error:", error);

    return res.status(500).json({
      error: "chat_failed",
      message: error?.message || "unknown error"
    });
  }
});

export default router;
