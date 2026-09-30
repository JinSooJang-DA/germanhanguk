/**
 * Date formatting utilities for GermanHanguk.
 * Hand-assembled formatting using Berlin timezone values.
 * Completely isolates the outputs from browser/Node ICU implementation differences,
 * ensuring byte-for-byte identical output on server and client.
 */

/**
 * Extracts individual date and time components in the Europe/Berlin timezone.
 * Highly robust against system/running environment timezone differences.
 */
export function getBerlinDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const rawHour = parseInt(partMap.hour || "0", 10);

  return {
    year: parseInt(partMap.year || "0", 10),
    month: parseInt(partMap.month || "0", 10),
    day: parseInt(partMap.day || "0", 10),
    hour: rawHour % 24,
    minute: parseInt(partMap.minute || "0", 10),
    second: parseInt(partMap.second || "0", 10),
  };
}

/**
 * Formats a date to a string (equivalent to toLocaleDateString()).
 * Outputs: "YYYY. M. D." (e.g. "2026. 9. 11.")
 */
export function formatDate(dateInput: string | Date | number): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  const parts = getBerlinDateParts(date);
  return `${parts.year}. ${parts.month}. ${parts.day}.`;
}

/**
 * Formats a date and time to a string (equivalent to toLocaleString()).
 * Outputs: "YYYY. M. D. [오전/오후] h:mm:ss" (e.g. "2026. 9. 11. 오후 11:10:47")
 */
export function formatDateTime(dateInput: string | Date | number): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  const parts = getBerlinDateParts(date);

  const hour24 = parts.hour;
  const isPM = hour24 >= 12;
  const period = isPM ? "오후" : "오전";

  let hour12 = hour24 % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }

  const mm = String(parts.minute).padStart(2, "0");
  const ss = String(parts.second).padStart(2, "0");

  return `${parts.year}. ${parts.month}. ${parts.day}. ${period} ${hour12}:${mm}:${ss}`;
}

/**
 * Formats a time to a string (equivalent to toLocaleTimeString()).
 * Outputs: "[오전/오후] h:mm:ss"
 */
export function formatTime(
  dateInput: string | Date | number
): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  const parts = getBerlinDateParts(date);

  const hour24 = parts.hour;
  const isPM = hour24 >= 12;
  const period = isPM ? "오후" : "오전";

  let hour12 = hour24 % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }

  const mm = String(parts.minute).padStart(2, "0");
  const ss = String(parts.second).padStart(2, "0");

  return `${period} ${hour12}:${mm}:${ss}`;
}

/**
 * Converts a date into a concise string, comparing with today in Europe/Berlin timezone.
 * Used for listing messages, ensuring consistent display without system timezone dependency.
 */
export function formatConciseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();

    const dParts = getBerlinDateParts(date);
    const nParts = getBerlinDateParts(now);

    if (
      dParts.year === nParts.year &&
      dParts.month === nParts.month &&
      dParts.day === nParts.day
    ) {
      const hh = String(dParts.hour).padStart(2, "0");
      const mm = String(dParts.minute).padStart(2, "0");
      return hh + ":" + mm;
    }

    if (dParts.year === nParts.year) {
      const month = String(dParts.month).padStart(2, "0");
      const day = String(dParts.day).padStart(2, "0");
      const hours = String(dParts.hour).padStart(2, "0");
      const minutes = String(dParts.minute).padStart(2, "0");
      return month + "." + day + " " + hours + ":" + minutes;
    }

    const year = String(dParts.year).slice(-2);
    const month = String(dParts.month).padStart(2, "0");
    const day = String(dParts.day).padStart(2, "0");
    return year + "." + month + "." + day;
  } catch {
    return dateStr;
  }
}
