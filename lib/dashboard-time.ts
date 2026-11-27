export function toLocalDateTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function fromLocalDateTime(value: string, timezone: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const localAsUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute);
  const parsedDate = new Date(localAsUtc);
  if (
    !Number.isFinite(localAsUtc) ||
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() !== Number(month) - 1 ||
    parsedDate.getUTCDate() !== Number(day) ||
    parsedDate.getUTCHours() !== Number(hour) ||
    parsedDate.getUTCMinutes() !== Number(minute)
  ) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let timestamp = localAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(timestamp)).map(({ type, value }) => [type, value]),
    );
    const representedAsUtc = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
    );
    timestamp = localAsUtc - (representedAsUtc - timestamp);
  }

  const finalParts = Object.fromEntries(
    formatter.formatToParts(new Date(timestamp)).map(({ type, value }) => [type, value]),
  );
  const expected = `${year}-${month}-${day}T${hour}:${minute}`;
  const resolved = `${finalParts.year}-${finalParts.month}-${finalParts.day}T${finalParts.hour}:${finalParts.minute}`;
  return resolved === expected ? new Date(timestamp).toISOString() : null;
}
