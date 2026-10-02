import "server-only";
import type { Tables } from "@/types/database";

const pad = (n: number) => String(n).padStart(2, "0");

/** Escapes text for an iCalendar property value (RFC 5545). */
const esc = (text: string) => text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** "2026-11-07" + "08:30:00" → "20261107T083000" (floating local time at the destination). */
const stamp = (date: string, time: string) => `${date.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;

function addMinutes(date: string, time: string, minutes: number) {
  const d = new Date(`${date}T${time.slice(0, 5)}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
}

/**
 * The itinerary as a calendar file any calendar app can import. Timed items
 * become events in local time at the destination; untimed ones are skipped.
 */
export function itineraryToIcs(
  title: string,
  days: Tables<"itinerary_days">[],
  items: Tables<"itinerary_items">[]
): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Roamly//Trip itinerary//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(title)}`];

  for (const day of days) {
    if (!day.date) continue;
    for (const item of items.filter((i) => i.day_id === day.id && i.start_time)) {
      const start = stamp(day.date, item.start_time!);
      // An end before the start means the item runs past midnight (an overnight flight).
      const end =
        item.end_time && item.end_time > item.start_time!
          ? stamp(day.date, item.end_time)
          : addMinutes(day.date, item.start_time!, 60);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${item.id}@roamly`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${esc(item.title)}`,
        ...(item.description ? [`DESCRIPTION:${esc(item.description)}`] : []),
        ...(item.lat !== null && item.lng !== null ? [`GEO:${item.lat};${item.lng}`] : []),
        ...(item.deep_link ? [`URL:${item.deep_link}`] : []),
        "END:VEVENT"
      );
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export const fileSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "trip";
