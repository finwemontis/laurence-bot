import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exportsDir = path.resolve(__dirname, "../../data/exports");

function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function ensureMessageTimestamps(history = []) {
  return history.map((item) => ({
    ...item,
    ts: item.ts || new Date().toISOString()
  }));
}

export function createMessage(role, content, ts = new Date()) {
  return {
    role,
    content,
    ts: toIsoString(ts)
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

export function buildExportFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `session_${year}${month}${day}_${hours}${minutes}${seconds}.json`;
}

export async function exportHistory(sessionId, history = []) {
  await fs.mkdir(exportsDir, { recursive: true });

  const payload = buildExportPayload(sessionId, history);
  const filename = buildExportFilename();
  const filePath = path.join(exportsDir, filename);

  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");

  return {
    filename,
    filePath,
    payload
  };
}
