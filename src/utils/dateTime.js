function pad(value) {
  return String(value).padStart(2, "0");
}

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function parseLocalDateTime(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value);
  }

  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  let match = raw.match(LOCAL_DATETIME_RE);
  if (match) {
    const [, year, month, day, hour, minute, second = "00"] = match;
    return new Date(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      Number.parseInt(hour, 10),
      Number.parseInt(minute, 10),
      Number.parseInt(second, 10),
      0
    );
  }

  match = raw.match(LOCAL_DATE_RE);
  if (match) {
    const [, year, month, day] = match;
    return new Date(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      0,
      0,
      0,
      0
    );
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toLocalDateKey(value) {
  const parsed = parseLocalDateTime(value);
  if (!parsed) {
    return "";
  }

  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function addDaysToLocalDateKey(dateKey, days) {
  const parsed = parseLocalDateTime(dateKey);
  if (!parsed) {
    return "";
  }

  parsed.setDate(parsed.getDate() + days);
  return toLocalDateKey(parsed);
}

export function toDateTimeLocalInputValue(value) {
  const parsed = parseLocalDateTime(value);
  if (!parsed) {
    return "";
  }

  return `${toLocalDateKey(parsed)}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}
