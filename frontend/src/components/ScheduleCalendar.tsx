'use client';

/**
 * Calendar-style scheduler: time on Y-axis, screens on X-axis.
 * Shows one day; dayOffset 0 = Monday of the selected week.
 */

const GRID_START_HOUR = 6;   // 6:00 AM
const GRID_END_HOUR = 26;    // 2:00 AM next day (26 = 2 AM)
const SLOT_MINUTES = 30;
const TOTAL_SLOTS = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES;

function slotLabel(index: number): string {
  const totalMins = GRID_START_HOUR * 60 + index * SLOT_MINUTES;
  const hour = Math.floor(totalMins / 60) % 24;
  const min = totalMins % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}:${min.toString().padStart(2, '0')} ${period}`;
}

export type ScheduleRow = {
  id: string;
  theater_name: string;
  city: string;
  screen_name: string;
  title: string;
  show_name: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  sold_count: number | null;
  occupancy_pct: number | null;
  ticket_price: number | null;
};

type Block = {
  id: string;
  screenKey: string;
  title: string;
  showName: string;
  startRow: number;
  endRow: number;
  occupancy_pct: number | null;
  row: ScheduleRow;
};

function getDayStart(weekStart: string, dayOffset: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function minutesFromGridStart(date: Date): number {
  const hours = date.getHours();
  const mins = date.getMinutes();
  const totalMins = hours * 60 + mins;
  const gridStartMins = GRID_START_HOUR * 60;
  const gridEndMins = GRID_END_HOUR * 60;
  if (totalMins >= gridStartMins) return totalMins - gridStartMins;
  return totalMins + (24 * 60 - gridStartMins); // next day
}

function rowFromMinutes(mins: number): number {
  return Math.floor(mins / SLOT_MINUTES);
}

export type ScheduleCalendarProps = {
  schedule: ScheduleRow[];
  weekStart: string;
  dayOffset: number; // 0 = Mon, 6 = Sun
  onDayChange?: (dayOffset: number) => void;
  onShowClick?: (row: ScheduleRow) => void;
  selectedShowId?: string | null;
};

export function ScheduleCalendar({
  schedule,
  weekStart,
  dayOffset,
  onDayChange,
  onShowClick,
  selectedShowId,
}: ScheduleCalendarProps) {
  const dayStart = getDayStart(weekStart, dayOffset);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const dayStartStr = dayStart.toISOString().slice(0, 10);
  const dayEndStr = dayEnd.toISOString().slice(0, 10);

  const showsOnDay = schedule.filter((row) => {
    const start = new Date(row.start_time);
    const startStr = start.toISOString().slice(0, 10);
    return startStr >= dayStartStr && startStr < dayEndStr;
  });

  const screenKeys = Array.from(
    new Set(showsOnDay.map((r) => `${r.theater_name ?? ''}|${r.screen_name ?? ''}`))
  ).filter(Boolean);
  screenKeys.sort();

  const blocks: Block[] = [];
  for (const row of showsOnDay) {
    const start = new Date(row.start_time);
    const end = new Date(row.end_time);
    const startMins = minutesFromGridStart(start);
    const endMins = minutesFromGridStart(end);
    let startRow = rowFromMinutes(startMins);
    let endRow = rowFromMinutes(endMins);
    if (endRow <= startRow) endRow = startRow + 1;
    endRow = Math.min(endRow, TOTAL_SLOTS);
    startRow = Math.max(0, startRow);
    const screenKey = `${row.theater_name ?? ''}|${row.screen_name ?? ''}`;
    blocks.push({
      id: row.id,
      screenKey,
      title: row.title || row.show_name || '—',
      showName: row.show_name,
      startRow,
      endRow,
      occupancy_pct: row.occupancy_pct ?? null,
      row,
    });
  }

  const isCovered = (row: number, screenKey: string): boolean => {
    return blocks.some(
      (b) =>
        b.screenKey === screenKey && row > b.startRow && row < b.endRow
    );
  };

  const getBlockAt = (row: number, screenKey: string): Block | null => {
    return blocks.find((b) => b.screenKey === screenKey && b.startRow === row) ?? null;
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const selectedDayLabel = dayLabels[dayOffset] ?? '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium text-gray-900">Schedule calendar</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Day:</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {dayLabels.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => onDayChange?.(i)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  i === dayOffset
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500">
            {dayStart.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
        {screenKeys.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No shows on this day. Select another day or week.
          </div>
        ) : (
          <table className="w-full border-collapse text-sm" style={{ minWidth: 480 }}>
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="w-20 text-left px-2 py-2 font-medium text-gray-600 border-b border-r border-gray-200">
                  Time
                </th>
                {screenKeys.map((key) => {
                  const [, screenName] = key.split('|');
                  const theaterName = key.split('|')[0];
                  const label = theaterName ? `${theaterName} — ${screenName || ''}` : (screenName || key);
                  return (
                    <th
                      key={key}
                      className="text-left px-2 py-2 font-medium text-gray-600 border-b border-gray-200 min-w-[120px]"
                    >
                      {label.trim() || 'Screen'}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: TOTAL_SLOTS }, (_, r) => (
                <tr key={r} className="border-b border-gray-100">
                  <td className="px-2 py-0.5 text-gray-500 border-r border-gray-100 align-top w-20 whitespace-nowrap">
                    {slotLabel(r)}
                  </td>
                  {screenKeys.map((screenKey) => {
                    if (isCovered(r, screenKey)) return null;
                    const block = getBlockAt(r, screenKey);
                    if (block) {
                      const span = block.endRow - block.startRow;
                      const occ = block.occupancy_pct ?? 0;
                      const barColor =
                        occ >= 70 ? 'bg-emerald-500' : occ >= 40 ? 'bg-amber-500' : 'bg-sky-600';
                      return (
                        <td
                          key={screenKey}
                          rowSpan={span}
                          className="align-top border-b border-gray-100 p-0"
                        >
                          <button
                            type="button"
                            onClick={() => onShowClick?.(block.row)}
                            className={`w-full text-left h-full min-h-[28px] mx-0.5 my-0.5 rounded-md border p-2 flex flex-col transition-colors ${
                              selectedShowId === block.id
                                ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-500'
                                : 'border-gray-200 bg-gray-50/80 hover:bg-gray-100 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium text-gray-900 truncate" title={block.title}>
                              {block.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                              {block.showName !== block.title ? block.showName : ''}
                            </div>
                            {block.occupancy_pct != null && (
                              <div className="mt-1 flex items-center gap-1">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${barColor} rounded-full`}
                                    style={{ width: `${Math.min(100, block.occupancy_pct)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600">{block.occupancy_pct}%</span>
                              </div>
                            )}
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td key={screenKey} className="align-top border-b border-gray-100 p-0">
                        <div className="min-h-[20px]" />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
