import type { ScheduleOverviewRow } from './programmeApi';

/**
 * Generate human-readable show times for a programme on a specific day.
 *
 * NOTE: The backend does not store individual show timestamps, only
 * high-level parameters (pattern, TAT, showsPerTheatre, etc.).
 * This helper synthesizes reasonable times for visualisation only.
 */
export function getShowTimesForDay(row: ScheduleOverviewRow, dayYMD: string): string[] {
  const start = row.startDate;
  const end = row.endDate ?? row.startDate;

  // Programme not active on this day.
  if (dayYMD < start || dayYMD > end) return [];

  const count = Math.max(1, row.showsPerTheatre ?? 1);
  const pattern = row.timeSlotPattern || 'linear';

  const times: string[] = [];

  // Helpers to convert minutes since midnight to "h:mm AM/PM"
  const toTimeString = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  if (pattern === 'linear') {
    // Spread shows from early morning through late evening.
    const spanMinutes = 18 * 60; // 6:00 -> 24:00
    const step = Math.floor(spanMinutes / (count + 1));
    for (let i = 0; i < count; i += 1) {
      const mins = 6 * 60 + step * (i + 1);
      times.push(toTimeString(mins));
    }
  } else if (pattern === 'evening-heavy') {
    // Concentrate shows between ~3pm and ~11pm.
    const startMins = 15 * 60; // 3:00 PM
    const spanMinutes = 8 * 60; // 3pm -> 11pm
    const step = Math.floor(spanMinutes / (count + 1));
    for (let i = 0; i < count; i += 1) {
      const mins = startMins + step * (i + 1);
      times.push(toTimeString(mins));
    }
  } else {
    // Art-house / festival: cluster more in daytime, but still spread.
    const startMins = 10 * 60; // 10:00 AM
    const spanMinutes = 10 * 60; // 10am -> 8pm
    const step = Math.floor(spanMinutes / (count + 1));
    for (let i = 0; i < count; i += 1) {
      const mins = startMins + step * (i + 1);
      times.push(toTimeString(mins));
    }
  }

  return times;
}

