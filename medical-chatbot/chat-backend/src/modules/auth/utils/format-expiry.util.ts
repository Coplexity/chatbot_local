/**
 * Format milliseconds into a human-readable expiry string
 * Returns the largest non-zero time unit (days, hours, minutes, or seconds)
 *
 * @param milliseconds - Time in milliseconds
 * @returns Formatted expiry string (e.g., "15 minutes", "2 hours", "1 day")
 */
export function formatExpiry(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? "1 day" : `${days} days`;
  }

  if (hours > 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  if (minutes > 0) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }

  return seconds === 1 ? "1 second" : `${seconds} seconds`;
}

/**
 * Format milliseconds into a detailed breakdown showing all non-zero time units
 *
 * @param milliseconds - Time in milliseconds
 * @returns Detailed expiry string (e.g., "1 day, 2 hours, 30 minutes", "15 minutes, 30 seconds")
 */
export function formatExpiryDetailed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(days === 1 ? "1 day" : `${days} days`);
  }

  if (remainingHours > 0) {
    parts.push(remainingHours === 1 ? "1 hour" : `${remainingHours} hours`);
  }

  if (remainingMinutes > 0) {
    parts.push(remainingMinutes === 1 ? "1 minute" : `${remainingMinutes} minutes`);
  }

  if (remainingSeconds > 0) {
    parts.push(remainingSeconds === 1 ? "1 second" : `${remainingSeconds} seconds`);
  }

  return parts.join(", ") || "0 seconds";
}
