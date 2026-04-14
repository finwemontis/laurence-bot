import OpenAI from "openai";
import { config } from "../config.js";

if (!config.deepseekApiKey) {
  throw new Error("缺少 DEEPSEEK_API_KEY，请检查 .env 文件");
}

const client = new OpenAI({
  apiKey: config.deepseekApiKey,
  baseURL: config.deepseekBaseUrl
});

export async function generateChatReply(messages) {
  const completion = await client.chat.completions.create({
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: false
  });

  return completion?.choices?.[0]?.message?.content?.trim() || "……我一时无话。";
}
