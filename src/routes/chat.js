// import路由
import express from "express";

// import主要功能
import { buildPrompt } from "../services/promptBuilder.js";
import { generateChatReply } from "../services/llmService.js";
import { getBaseLore } from "../services/loreService.js";
import { createMessage, ensureMessageTimestamps } from "../services/historyService.js";
// import逻辑处理脚本
import { handleDebugCommand } from "../logic/commandHandler.js";
import { applyAssistantReplyToSessionState, applyUserMessageToSessionState, getLockedReply } from "../logic/state/sessionGuard.js";
import { ensureSessionId, readActiveSessionState, saveSessionState, snapshotSessionState } from "../logic/state/stateLogic.js";

// 创建聊天路由
const router = express.Router();

// debug工具 打印session state
function logSessionState(label, payload) {
  console.log(`[session-debug] ${label}`);
  console.log(JSON.stringify(payload, null, 2));
}

// debug工具 打印发给llm api的prompt
function logPromptMessages(messages) {
  console.log("[prompt-debug] messages");
  console.log(JSON.stringify(messages, null, 2));
}

// 聊天主接口: 接收用户消息 生成回复 并更新会话状态
router.post("/chat", async (req, res) => {
  try {
    // 1. 从请求体接收message和history
    const { message, history = [], sessionId } = req.body;
    // sessionId由前端生成 每个设备的每个浏览器唯一 如果id不合法 ensureSessionId补一个合法的
    const resolvedSessionId = ensureSessionId(sessionId);   


    // 2. 校验输入 
    // 检查message格式
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

    // 检查并规范history格式
    const normalizedHistory = ensureMessageTimestamps(history);
    

    // 3. 处理debug命令
    // 检查当前是不是debug命令 优先处理调试命令
    const debugResult = await handleDebugCommand(message, normalizedHistory, resolvedSessionId);
    // 如果是debug命令 并且已经处理了 记录调试日志并直接return
    if (debugResult?.handled) {
      if (debugResult.meta?.state) {
        logSessionState("debug-command", {
          sessionId: debugResult.sessionId,
          command: debugResult.meta.command,
          message,
          sessionState: debugResult.meta.state
        });
      }

      return res.json({
        ok: true,
        sessionId: debugResult.sessionId || resolvedSessionId,
        reply: debugResult.reply,
        history: debugResult.history,
        meta: debugResult.meta || null
      });
    }


    // 4. 处理聊天
    // 4.1 从文件中读当前session state 根据sessionId读取 路径./data/sessions/ 如果没有就新建
    let sessionState = await readActiveSessionState(resolvedSessionId);

    // 4.2 处理对话锁定
    // 根据当前session state判断对话是否锁定
    const lockMessage = getLockedReply(sessionState);

    // 如锁定 不调用llm 生成当前session state快照并保存 记录日志 返回固定回复 并直接return
    if (lockMessage) {
      const lockedSnapshot = snapshotSessionState(sessionState);
      await saveSessionState(sessionState);
      logSessionState("locked-response", {
        sessionId: sessionState.sessionId,
        message,
        sessionState: lockedSnapshot
      });

      return res.json({
        ok: true,
        sessionId: sessionState.sessionId,
        reply: lockMessage,
        history: normalizedHistory,
        meta: {
          locked: true,
          sessionState: lockedSnapshot
        }
      });
    }

    // 4.3 根据用户发送的message更新session state 为构造prompt做准备
    // sessionState: state值转换的llm可处理的prompt
    sessionState = applyUserMessageToSessionState(sessionState, message);

    // 4.4 获取设定
    const lore = await getBaseLore();

    // 4.5 组装prompt
    const { messages, sanitizedHistory } = buildPrompt({
      message,
      history: normalizedHistory,
      lore,
      sessionState
    });

    // 4.6 在后端打印最终prompt
    logPromptMessages(messages);

    // 4.7 调用llm生成回复
    const reply = await generateChatReply(messages);

    // 4.8 llm回复后 更新state中的时间戳
    const timestamp = new Date();
    let nextSessionState = applyAssistantReplyToSessionState(sessionState, reply, timestamp);
    nextSessionState = await saveSessionState(nextSessionState, timestamp);
    // 生成state snapshot
    const sessionStateSnapshot = snapshotSessionState(nextSessionState);

    // 4.9 打印session debug日志
    logSessionState("chat-response", {
      sessionId: nextSessionState.sessionId,
      message,
      reply,
      sessionState: sessionStateSnapshot
    });

    // 4.10 生成新history
    const newHistory = [
      ...sanitizedHistory,
      createMessage("user", message, timestamp),
      createMessage("assistant", reply, timestamp)
    ];

    // 4.11 正常return
    return res.json({
      ok: true,
      sessionId: nextSessionState.sessionId,
      reply,
      history: newHistory,
      meta: {
        sessionState: sessionStateSnapshot
      }
    });

  // 5. 统一错误处理: 
  } catch (error) {
    console.error("oh no, error:", error);

    return res.status(500).json({
      error: "chat_failed",
      message: error?.message || "unknown error"
    });
  }
});

export default router;
