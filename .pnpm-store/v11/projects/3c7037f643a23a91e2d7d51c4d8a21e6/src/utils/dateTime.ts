const DATE_TIME_WITH_TIMEZONE_REGEX = /(?:z|[+-]\d{2}:?\d{2})$/i;

const pad2 = (value: number) => String(value).padStart(2, "0");

const parseLocalDateTimeParts = (value: string) => {
  const match = value
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);

  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    second: Number(match[6] ?? 0),
  };
};

const toLocalDate = (value: string) => {
  if (DATE_TIME_WITH_TIMEZONE_REGEX.test(value.trim())) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parts = parseLocalDateTimeParts(value);
  if (!parts) return null;

  return new Date(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
};

export const toDateTimeLocalInput = (value?: string) => {
  if (!value) return "";

  const cleanValue = value.trim();
  if (!DATE_TIME_WITH_TIMEZONE_REGEX.test(cleanValue)) {
    return cleanValue.slice(0, 16);
  }

  const date = new Date(cleanValue);
  if (Number.isNaN(date.getTime())) return cleanValue.slice(0, 16);

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

export const toApiLocalDateTime = (value: string) => (value ? (value.length === 16 ? `${value}:00` : value) : "");

export const formatVietnamDate = (value?: string) => {
  if (!value) return "";

  const cleanValue = value.trim();
  const slashParts = cleanValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashParts) {
    return `${pad2(Number(slashParts[1]))}/${pad2(Number(slashParts[2]))}/${slashParts[3]}`;
  }

  const date = toLocalDate(cleanValue);
  if (!date) return cleanValue;

  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const formatVietnamDateTime = (value?: string, fallback = "N/A") => {
  if (!value) return fallback;

  const date = toLocalDate(value);
  if (!date) return value.slice(0, 16).replace("T", " ");

  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};
