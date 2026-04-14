import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  deepseekBaseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
  temperature: 0.7,
  maxTokens: 300
};
