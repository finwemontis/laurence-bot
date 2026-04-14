import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const port = process.env.PORT || 3000;

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("缺少 DEEPSEEK_API_KEY，请检查 .env 文件");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com"
});

const SYSTEM_PROMPT = fs.readFileSync("./character_info/prompt_core.txt", "utf-8");
const CHARACTER_CARD = fs.readFileSync("./character_info/laurence_card.txt", "utf-8");
const LORE_LUDWIG = fs.readFileSync("./character_info/ludwig_relationship.txt", "utf-8");

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "the Bishop is working..."
  });
});

app.get("/", (req, res) => {
  res.type("html").send(`
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>Laurence Bot Test</title>
  <style>
    body {
      font-family: sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 0 16px;
      line-height: 1.6;
    }
    textarea {
      width: 100%;
      min-height: 120px;
      margin-bottom: 12px;
      font-size: 16px;
      padding: 12px;
      box-sizing: border-box;
    }
    button {
      padding: 10px 16px;
      font-size: 16px;
      cursor: pointer;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      background: #f6f6f6;
      padding: 12px;
      border-radius: 8px;
      margin-top: 16px;
    }
    .muted {
      color: #666;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <h1>Laurence 聊天测试页</h1>
  <p class="muted">本地测试用页面。输入一句话，点发送即可。</p>

  <textarea id="message" placeholder="比如：你今天为什么又没按时吃晚饭？"></textarea>
  <br />
  <button id="sendBtn">发送</button>

  <pre id="output">等待输入……</pre>

  <script>
    const history = [];
    const output = document.getElementById("output");
    const sendBtn = document.getElementById("sendBtn");
    const messageInput = document.getElementById("message");

    async function sendMessage() {
      const message = messageInput.value.trim();
      if (!message) return;

      sendBtn.disabled = true;
      output.textContent = "请求中……";

      try {
        const resp = await fetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            history
          })
        });

        const data = await resp.json();

        if (!resp.ok) {
          output.textContent = "请求失败：\\n" + JSON.stringify(data, null, 2);
          return;
        }

        history.length = 0;
        history.push(...data.history);

        output.textContent =
          "Laurence：\\n\\n" + data.reply + "\\n\\n---\\n\\n完整 history：\\n" +
          JSON.stringify(data.history, null, 2);

        messageInput.value = "";
      } catch (err) {
        output.textContent = "网络错误：\\n" + String(err);
      } finally {
        sendBtn.disabled = false;
      }
    }

    sendBtn.addEventListener("click", sendMessage);
    messageInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        sendMessage();
      }
    });
  </script>
</body>
</html>
  `);
});

app.post("/chat", async (req, res) => {
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

    const openingGuard = history.length === 0
      ? [{
          role: "system",
          content: "这是对话的第一轮。不要做模板化自我介绍，不要说自己是司事、执事、普通神父、接待人员，不要说“有什么可以为您效劳吗”。第一句应简短、克制、自然，像Laurence本人在看着来人开口。"
        }]
      : [];

    const sanitizedHistory = history
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string"
      )
      .slice(-20); // 先只保留最近20条，避免越来越长

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: CHARACTER_CARD },
      { role: "system", content: LORE_LUDWIG },
      ...openingGuard,
      ...sanitizedHistory,
      { role: "user", content: message }
    ];

    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages,
      temperature: 0.7,
      max_tokens: 300,
      stream: false
    });

    const reply =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "……我一时无话。";

    const newHistory = [
      ...sanitizedHistory,
      { role: "user", content: message },
      { role: "assistant", content: reply }
    ];

    res.json({
      ok: true,
      reply,
      history: newHistory
    });
  } catch (error) {
    console.error("chat error:", error);

    res.status(500).json({
      error: "chat_failed",
      message: error?.message || "unknown error"
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});