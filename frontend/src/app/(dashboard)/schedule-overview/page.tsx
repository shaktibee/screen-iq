'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchRegions,
  fetchLocations,
  fetchTheatres,
  fetchCalendar,
  fetchTheatreSchedule,
  type Region,
  type Location,
  type Theatre,
  type CalendarItem,
  type TheatreScheduleResponse,
} from '@/lib/programmeApi';
import { cn } from '@/lib/utils';
import { Calendar, Loader2, Film, MapPin, X } from 'lucide-react';

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'custom';

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
];

function getWeekStart(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Format date as YYYY-MM-DD in local time (for calendar dates). */
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getRange(preset: DatePreset, customStart?: string, customEnd?: string): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preset === 'custom') {
    if (customStart && customEnd) return { start: customStart, end: customEnd };
    const fallback = toYMD(today);
    return { start: customStart || fallback, end: customEnd || fallback };
  }
  if (preset === 'today') {
    const s = toYMD(today);
    return { start: s, end: s };
  }
  if (preset === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const s = toYMD(y);
    return { start: s, end: s };
  }
  if (preset === 'this_week') {
    const start = getWeekStart(today);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: toYMD(start), end: toYMD(end) };
  }
  if (preset === 'last_week') {
    const start = getWeekStart(today);
    start.setDate(start.getDate() - 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: toYMD(start), end: toYMD(end) };
  }
  if (preset === 'this_month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: toYMD(start), end: toYMD(end) };
  }
  // default this week
  const start = getWeekStart(today);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: toYMD(start), end: toYMD(end) };
}

function getDaysInRange(start: string, end: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const curr = new Date(sy, sm - 1, sd);
  const last = new Date(ey, em - 1, ed);
  while (curr <= last) {
    out.push(toYMD(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return out;
}

/** Returns true if programme (startDate..endDate) is active on day YMD. */
function programmeActiveOnDay(item: CalendarItem, day: string): boolean {
  const d = day.slice(0, 10);
  const start = (item.startDate ?? '').slice(0, 10);
  const end = item.endDate ? (item.endDate + '').slice(0, 10) : null;
  if (d < start) return false;
  if (end && d > end) return false;
  return true;
}

type ViewMode = 'theatre' | 'screen';

export default function ScheduleOverviewPage() {
  const [preset, setPreset] = useState<DatePreset>('this_week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [regionIds, setRegionIds] = useState<string[]>([]);
  const [locationId, setLocationId] = useState<string>('');
  const [theatreId, setTheatreId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('theatre');

  const [regions, setRegions] = useState<Region[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theatreDetail, setTheatreDetail] = useState<{ theatreId: string; theatreName: string; sublabel: string } | null>(null);
  const [theatreSchedule, setTheatreSchedule] = useState<TheatreScheduleResponse | null>(null);
  const [theatreScheduleLoading, setTheatreScheduleLoading] = useState(false);

  const { start, end } = useMemo(
    () => getRange(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );
  const days = useMemo(() => getDaysInRange(start, end), [start, end]);

  const loadRegions = useCallback(async () => {
    try {
      const list = await fetchRegions();
      setRegions(list);
    } catch {
      setRegions([]);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    if (regionIds.length === 0) {
      setLocations([]);
      return;
    }
    try {
      const all: Location[] = [];
      for (const rid of regionIds) {
        const list = await fetchLocations(undefined, rid);
        list.forEach((l) => all.push(l));
      }
      setLocations(all);
    } catch {
      setLocations([]);
    }
  }, [regionIds]);

  const loadTheatres = useCallback(async () => {
    if (locationId) {
      try {
        const list = await fetchTheatres(locationId);
        setTheatres(list);
      } catch {
        setTheatres([]);
      }
    } else if (regionIds.length > 0) {
      try {
        const all: Theatre[] = [];
        for (const rid of regionIds) {
          const list = await fetchTheatres(undefined, undefined, rid);
          list.forEach((t) => all.push(t));
        }
        setTheatres(all);
      } catch {
        setTheatres([]);
      }
    } else {
      try {
        const list = await fetchTheatres();
        setTheatres(list);
      } catch {
        setTheatres([]);
      }
    }
  }, [locationId, regionIds]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCalendar({
        startDate: start,
        endDate: end,
        regionIds: regionIds.length ? regionIds.join(',') : undefined,
        locationIds: locationId ? locationId : undefined,
        theatreIds: theatreId ? theatreId : undefined,
      });
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedule');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [start, end, regionIds, locationId, theatreId]);

  useEffect(() => {
    loadRegions();
  }, [loadRegions]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadTheatres();
  }, [loadTheatres]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (!theatreDetail || !start) {
      setTheatreSchedule(null);
      return;
    }
    setTheatreScheduleLoading(true);
    setTheatreSchedule(null);
    fetchTheatreSchedule(theatreDetail.theatreId, start)
      .then(setTheatreSchedule)
      .catch(() => setTheatreSchedule(null))
      .finally(() => setTheatreScheduleLoading(false));
  }, [theatreDetail?.theatreId, start]);

  const openTheatreDetail = useCallback((id: string, name: string, sublabel: string) => {
    setTheatreDetail({ theatreId: id, theatreName: name, sublabel });
  }, []);

  const toggleRegion = (id: string) => {
    setRegionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setLocationId('');
    setTheatreId('');
  };

  const rows = useMemo(() => {
    if (viewMode === 'theatre') {
      const byTheatre = new Map<string, CalendarItem[]>();
      for (const item of items) {
        const key = item.theatreId;
        if (!byTheatre.has(key)) byTheatre.set(key, []);
        byTheatre.get(key)!.push(item);
      }
      return Array.from(byTheatre.entries()).map(([theatreId, list]) => {
        const first = list[0];
        return {
          id: theatreId,
          label: first.theatreName,
          sublabel: `${first.locationName} · ${first.regionName}`,
          screenCount: first.screenCount,
          theatreScreenNames: first.theatreScreenNames ?? undefined,
          items: list,
        };
      });
    }
    const byTheatreScreen = new Map<string, { screenNum: number; items: CalendarItem[] }>();
    for (const item of items) {
      for (let s = 1; s <= item.screenCount; s++) {
        const key = `${item.theatreId}@${s}`;
        if (!byTheatreScreen.has(key)) byTheatreScreen.set(key, { screenNum: s, items: [] });
        byTheatreScreen.get(key)!.items.push({ ...item });
      }
    }
    return Array.from(byTheatreScreen.entries()).map(([key, { screenNum, items: list }]) => {
      const first = list[0];
      const screenName = first.theatreScreenNames?.[screenNum - 1] ?? `Screen ${screenNum}`;
      return {
        id: key,
        label: `${first.theatreName} – ${screenName}`,
        sublabel: first.locationName,
        screenCount: 1,
        theatreScreenNames: first.theatreScreenNames ?? undefined,
        items: list,
      };
    });
  }, [items, viewMode]);

  return (
    <div className="w-full max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-[#1e3a5f]">Home</Link>
            <span aria-hidden>/</span>
            <span className="text-[#1e3a5f] font-medium">Schedule Overview</span>
          </nav>
          <h1 className="text-2xl font-semibold text-[#1e3a5f] flex items-center gap-2">
            <Calendar className="h-7 w-7" />
            Schedule Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Calendar view of programmes by theatre or screen. Filter by region, location, and date range.
          </p>
        </div>
        <Link href="/programme/new">
          <Button className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">Create programme</Button>
        </Link>
      </div>

      <Card className="border bg-white">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1e3a5f]">Filters</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Date range</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {preset === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>From</Label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div className="text-sm text-muted-foreground">
              {start} → {end}
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <Label>Regions</Label>
              <div className="flex flex-wrap gap-2">
                {regions.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
                    <Checkbox
                      checked={regionIds.includes(r.id)}
                      onCheckedChange={() => toggleRegion(r.id)}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location (city)</Label>
              <Select
                value={locationId || '__all__'}
                onValueChange={(v) => {
                  setLocationId(v === '__all__' ? '' : v);
                  setTheatreId('');
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Theatre</Label>
              <Select
                value={theatreId || '__all__'}
                onValueChange={(v) => setTheatreId(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {theatres.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.locationName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>View by</Label>
              <div className="flex rounded-lg border p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('theatre')}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium',
                    viewMode === 'theatre' ? 'bg-[#1e3a5f] text-white' : 'text-muted-foreground hover:bg-gray-100'
                  )}
                >
                  Theatre
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('screen')}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium',
                    viewMode === 'screen' ? 'bg-[#1e3a5f] text-white' : 'text-muted-foreground hover:bg-gray-100'
                  )}
                >
                  Screen
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card className="border bg-white overflow-hidden">
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">Schedule</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} {viewMode === 'theatre' ? 'theatres' : 'screens'} · {days.length} days
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              No programmes in this date range. Create one from{' '}
              <Link href="/programme/new" className="text-[#1e3a5f] underline">Create programme</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left font-semibold text-[#1e3a5f] p-3 min-w-[200px] sticky left-0 z-10 bg-gray-50 border-r">
                      {viewMode === 'theatre' ? 'Theatre' : 'Screen'}
                    </th>
                    {days.map((day) => {
                      const [y, m, d] = day.split('-').map(Number);
                      const date = new Date(y, m - 1, d);
                      return (
                        <th key={day} className="text-center font-semibold text-[#1e3a5f] p-3 min-w-[140px] border-r last:border-r-0">
                          {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50/50">
                      <td className="p-3 sticky left-0 z-10 bg-white border-r hover:bg-gray-50/50">
                        <button
                          type="button"
                          onClick={() => openTheatreDetail(viewMode === 'theatre' ? row.id : row.id.split('@')[0], row.items[0]?.theatreName ?? row.label, row.sublabel)}
                          className="text-left w-full hover:bg-gray-100 rounded px-1 -mx-1 py-0.5 -my-0.5 transition-colors"
                          title="View theatre details: screens and movies"
                        >
                          <div className="font-medium text-gray-900">{row.label}</div>
                          <div className="text-xs text-muted-foreground">{row.sublabel}</div>
                          {viewMode === 'theatre' && row.theatreScreenNames && row.theatreScreenNames.length > 0 && (
                            <div className="text-[11px] text-muted-foreground mt-1" title={row.theatreScreenNames.join(', ')}>
                              {row.theatreScreenNames.slice(0, 5).join(' · ')}
                              {row.theatreScreenNames.length > 5 && ` +${row.theatreScreenNames.length - 5}`}
                            </div>
                          )}
                        </button>
                      </td>
                      {days.map((day) => {
                        const cellItems = row.items.filter((item) => programmeActiveOnDay(item, day));
                        return (
                          <td key={day} className="p-2 align-top border-r last:border-r-0 min-w-[140px]">
                            <div className="flex flex-col gap-1.5">
                              {cellItems.length === 0 ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : (
                                cellItems.map((item) => (
                                  <div
                                    key={`${item.programmeId}-${item.theatreId}`}
                                    className="rounded border border-[#1e3a5f]/20 bg-[#1e3a5f]/05 px-2 py-1.5"
                                  >
                                    <div className="font-medium text-[#1e3a5f] flex items-center gap-1">
                                      <Film className="h-3.5 w-3.5 shrink-0" />
                                      {item.movieTitle}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {item.showsPerTheatre} shows · {item.showsPerScreen}/screen
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {theatreDetail && (
        <Card className="border bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1e3a5f]">Theatre details</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setTheatreDetail(null); setTheatreSchedule(null); }} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-medium text-gray-900">{theatreDetail.theatreName}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {theatreDetail.sublabel}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              For {start} — which movie runs on each screen
            </p>
            {theatreScheduleLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : theatreSchedule ? (
              <div className="space-y-1.5">
                {theatreSchedule.screens.map((sc) => (
                  <div
                    key={sc.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-[#1e3a5f] shrink-0 w-[72px]">{sc.name}</span>
                    <span className="truncate text-gray-800 min-w-0" title={sc.programme?.movieTitle}>
                      {sc.programme ? (
                        <>
                          <Film className="h-3.5 w-3.5 inline shrink-0 mr-1 text-muted-foreground" />
                          {sc.programme.movieTitle}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No schedule data.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

