import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { formatUtc8Timestamp, getUtc8Parts } from "../utils/time.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exportsDir = path.resolve(__dirname, "../../data/exports");

function toTimestampString(value) {
  return formatUtc8Timestamp(value);
}

export function ensureMessageTimestamps(history = []) {
  return history.map((item) => ({
    ...item,
    ts: item.ts || formatUtc8Timestamp()
  }));
}

export function createMessage(role, content, ts = new Date()) {
  return {
    role,
    content,
    ts: toTimestampString(ts)
  };
}

export function buildExportPayload(sessionId, history = []) {
  return {
    sessionId,
    messages: ensureMessageTimestamps(history).map((item) => ({
      role: item.role,
      content: item.content,
      ts: item.ts
    }))
  };
}

export function buildExportFilename(sessionId, date = new Date()) {
  const parts = getUtc8Parts(date);
  const prefix = typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : "session";

  return `${prefix}_${parts.year}${parts.month}${parts.day}_${parts.hours}${parts.minutes}${parts.seconds}.json`;
}

export async function exportHistory(sessionId, history = []) {
  await fs.mkdir(exportsDir, { recursive: true });

  const payload = buildExportPayload(sessionId, history);
  const filename = buildExportFilename(sessionId);
  const filePath = path.join(exportsDir, filename);

  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");

  return {
    filename,
    filePath,
    payload
  };
}
