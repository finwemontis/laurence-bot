const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, "0");
}

function toUtc8Date(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() + UTC8_OFFSET_MS);
}

export function formatUtc8Timestamp(value = new Date()) {
  const shifted = toUtc8Date(value);
  return `${shifted.toISOString().slice(0, 19)}+08:00`;
}

export function getUtc8Parts(value = new Date()) {
  const shifted = toUtc8Date(value);

  return {
    year: shifted.getUTCFullYear(),
    month: pad(shifted.getUTCMonth() + 1),
    day: pad(shifted.getUTCDate()),
    hours: pad(shifted.getUTCHours()),
    minutes: pad(shifted.getUTCMinutes()),
    seconds: pad(shifted.getUTCSeconds())
  };
}