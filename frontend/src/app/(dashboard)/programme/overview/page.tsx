'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchScheduleOverview,
  fetchRegions,
  fetchStates,
  fetchLocations,
  fetchTheatres,
  fetchTheatreSchedule,
  type ScheduleOverviewRow,
  type Region,
  type State,
  type Location,
  type Theatre,
  type TheatreScheduleResponse,
} from '@/lib/programmeApi';
import { getShowTimesForDay } from '@/lib/scheduleTimes';
import { Loader2, Plus, X, Calendar, MapPin, Film, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALL_VALUE = '__all__';

const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This week' },
  { id: 'last_week', label: 'Last week' },
  { id: 'this_month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
] as const;

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(ymd: string, delta: number): string {
  const d = new Date(ymd + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return toYMD(d);
}

function daysBetween(fromYMD: string, toYMD: string): number {
  const from = new Date(fromYMD + 'T12:00:00').getTime();
  const to = new Date(toYMD + 'T12:00:00').getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000)) + 1;
}

/** Returns initial window (start YMD, number of days) for a preset. */
function getPresetWindow(preset: string, customFrom?: string, customTo?: string): { startYMD: string; numDays: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start: Date;
  let numDays: number;

  switch (preset) {
    case 'today':
      start = new Date(today);
      numDays = 1;
      break;
    case 'yesterday':
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      numDays = 1;
      break;
    case 'this_week': {
      const day = today.getDay();
      const mon = new Date(today);
      mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1));
      start = mon;
      numDays = 7;
      break;
    }
    case 'last_week': {
      const day = today.getDay();
      const mon = new Date(today);
      mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1) - 7);
      start = mon;
      numDays = 7;
      break;
    }
    case 'this_month': {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      numDays = end.getDate();
      break;
    }
    case 'custom':
    default:
      if (customFrom && customTo) {
        start = new Date(customFrom + 'T12:00:00');
        numDays = Math.max(1, daysBetween(customFrom, customTo));
      } else {
        const mon = new Date(today);
        mon.setDate(mon.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
        start = mon;
        numDays = 7;
      }
      break;
  }
  return { startYMD: toYMD(start), numDays };
}

function rangeToDays(startYMD: string, numDays: number): { dateFrom: string; dateTo: string; days: Date[] } {
  const dateFrom = startYMD;
  const dateTo = addDays(startYMD, numDays - 1);
  const days: Date[] = [];
  const d = new Date(dateFrom + 'T12:00:00');
  for (let i = 0; i < numDays; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return { dateFrom, dateTo, days };
}

function isDayInProgramme(day: Date, startDate: string, endDate: string | null) {
  const dayStr = toYMD(day);
  if (dayStr < startDate) return false;
  if (endDate == null) return true;
  return dayStr <= endDate;
}

type ViewMode = 'date' | 'time';
type SelectedItem = { row: ScheduleOverviewRow; dayYMD: string; screenIndex?: number; screenName?: string } | null;

/** Consistent colors per auditorium index (same index = same color across theatre column and calendar). */
const AUDITORIUM_COLORS = [
  { chip: 'bg-blue-100 text-blue-800 border-blue-300', card: 'bg-blue-50 border-l-blue-500 hover:bg-blue-100', ring: 'ring-blue-500' },
  { chip: 'bg-emerald-100 text-emerald-800 border-emerald-300', card: 'bg-emerald-50 border-l-emerald-500 hover:bg-emerald-100', ring: 'ring-emerald-500' },
  { chip: 'bg-amber-100 text-amber-800 border-amber-300', card: 'bg-amber-50 border-l-amber-500 hover:bg-amber-100', ring: 'ring-amber-500' },
  { chip: 'bg-violet-100 text-violet-800 border-violet-300', card: 'bg-violet-50 border-l-violet-500 hover:bg-violet-100', ring: 'ring-violet-500' },
  { chip: 'bg-rose-100 text-rose-800 border-rose-300', card: 'bg-rose-50 border-l-rose-500 hover:bg-rose-100', ring: 'ring-rose-500' },
  { chip: 'bg-cyan-100 text-cyan-800 border-cyan-300', card: 'bg-cyan-50 border-l-cyan-500 hover:bg-cyan-100', ring: 'ring-cyan-500' },
  { chip: 'bg-orange-100 text-orange-800 border-orange-300', card: 'bg-orange-50 border-l-orange-500 hover:bg-orange-100', ring: 'ring-orange-500' },
  { chip: 'bg-teal-100 text-teal-800 border-teal-300', card: 'bg-teal-50 border-l-teal-500 hover:bg-teal-100', ring: 'ring-teal-500' },
];

const INITIAL_WINDOW = getPresetWindow('this_week');

export default function ScheduleOverviewPage() {
  const [datePreset, setDatePreset] = useState<string>('this_week');
  const [windowStart, setWindowStart] = useState(INITIAL_WINDOW.startYMD);
  const [windowSize, setWindowSize] = useState(INITIAL_WINDOW.numDays);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [regionId, setRegionId] = useState('');
  const [stateId, setStateId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [theatreId, setTheatreId] = useState('');
  const [viewLevel, setViewLevel] = useState<'theatre' | 'screen'>('theatre');
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [theatreDetail, setTheatreDetail] = useState<{ theatreId: string; theatreName: string; locationName: string } | null>(null);
  const [theatreSchedule, setTheatreSchedule] = useState<TheatreScheduleResponse | null>(null);
  const [theatreScheduleLoading, setTheatreScheduleLoading] = useState(false);

  const [regions, setRegions] = useState<Region[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [rows, setRows] = useState<ScheduleOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { dateFrom, dateTo, days } = useMemo(
    () => rangeToDays(windowStart, windowSize),
    [windowStart, windowSize]
  );

  const handlePresetChange = useCallback((preset: string) => {
    setDatePreset(preset);
    const { startYMD, numDays } = getPresetWindow(preset, customFrom || undefined, customTo || undefined);
    setWindowStart(startYMD);
    setWindowSize(numDays);
    if (preset === 'custom') {
      setCustomFrom(startYMD);
      setCustomTo(addDays(startYMD, numDays - 1));
    }
  }, [customFrom, customTo]);

  const goPrev = useCallback(() => {
    const newStart = addDays(windowStart, -windowSize);
    setWindowStart(newStart);
    if (datePreset === 'custom') {
      setCustomFrom(newStart);
      setCustomTo(addDays(newStart, windowSize - 1));
    }
  }, [windowSize, windowStart, datePreset]);

  const goNext = useCallback(() => {
    const newStart = addDays(windowStart, windowSize);
    setWindowStart(newStart);
    if (datePreset === 'custom') {
      setCustomFrom(newStart);
      setCustomTo(addDays(newStart, windowSize - 1));
    }
  }, [windowSize, windowStart, datePreset]);

  const handleCustomFromChange = useCallback((from: string) => {
    setCustomFrom(from);
    if (customTo) setWindowStart(from);
    if (customTo && from <= customTo) setWindowSize(daysBetween(from, customTo));
  }, [customTo]);

  const handleCustomToChange = useCallback((to: string) => {
    setCustomTo(to);
    if (customFrom && customFrom <= to) {
      setWindowStart(customFrom);
      setWindowSize(daysBetween(customFrom, to));
    }
  }, [customFrom]);

  const loadFilters = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([fetchRegions(), fetchStates()]);
      setRegions(r);
      setStates(s);
    } catch {
      setRegions([]);
      setStates([]);
    }
  }, []);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    if (!regionId) {
      setStates([]);
      return;
    }
    fetchStates(regionId).then(setStates).catch(() => setStates([]));
  }, [regionId]);

  useEffect(() => {
    if (stateId) {
      fetchLocations(stateId).then(setLocations).catch(() => setLocations([]));
    } else if (regionId) {
      fetchLocations(undefined, regionId).then(setLocations).catch(() => setLocations([]));
    } else {
      fetchLocations().then(setLocations).catch(() => setLocations([]));
    }
  }, [stateId, regionId]);

  useEffect(() => {
    if (locationId) {
      fetchTheatres(locationId).then(setTheatres).catch(() => setTheatres([]));
    } else if (stateId) {
      fetchTheatres(undefined, stateId).then(setTheatres).catch(() => setTheatres([]));
    } else if (regionId) {
      fetchTheatres(undefined, undefined, regionId).then(setTheatres).catch(() => setTheatres([]));
    } else {
      fetchTheatres().then(setTheatres).catch(() => setTheatres([]));
    }
  }, [locationId, stateId, regionId]);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScheduleOverview({
        dateFrom,
        dateTo,
        regionId: regionId || undefined,
        stateId: stateId || undefined,
        locationId: locationId || undefined,
        theatreId: theatreId || undefined,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedule');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, regionId, stateId, locationId, theatreId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    if (!theatreDetail || !dateFrom) {
      setTheatreSchedule(null);
      return;
    }
    setTheatreScheduleLoading(true);
    setTheatreSchedule(null);
    fetchTheatreSchedule(theatreDetail.theatreId, dateFrom)
      .then(setTheatreSchedule)
      .catch(() => setTheatreSchedule(null))
      .finally(() => setTheatreScheduleLoading(false));
  }, [theatreDetail?.theatreId, dateFrom]);

  const openTheatreDetail = useCallback((row: ScheduleOverviewRow) => {
    setTheatreDetail({ theatreId: row.theatreId, theatreName: row.theatreName, locationName: row.locationName });
  }, []);

  const uniqueTheatres = useMemo(() => {
    const seen = new Set<string>();
    return rows
      .slice()
      .sort((a, b) => (a.locationName + a.theatreName).localeCompare(b.locationName + b.theatreName))
      .filter((r) => {
        if (seen.has(r.theatreId)) return false;
        seen.add(r.theatreId);
        return true;
      });
  }, [rows]);

  const getProgrammesForCell = useCallback(
    (theatreId: string, day: Date) =>
      rows.filter(
        (r) =>
          r.theatreId === theatreId &&
          isDayInProgramme(day, r.startDate, r.endDate)
      ),
    [rows]
  );

  const displayDays = useMemo(() => {
    if (days.length <= 7) return days;
    return days.slice(0, 7);
  }, [days]);

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6 flex flex-col flex-1">
      <div className="flex flex-wrap items-center justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-[#1e3a5f]">Home</Link>
            <span aria-hidden>/</span>
            <span className="text-[#1e3a5f] font-medium">Schedule overview</span>
          </nav>
          <h1 className="text-2xl font-semibold text-[#1e3a5f]">Schedule overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Calendar view of programmes by theatre. Filter by region, city, or theatre.
          </p>
        </div>
        <Link href="/programme/new" className="shrink-0">
          <Button className="bg-[#1e3a5f] hover:bg-[#2d4a6f]">
            <Plus className="mr-2 h-4 w-4" />
            Create programme
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#2d4a6f]/20 bg-white px-4 py-2.5 shadow-sm min-w-0">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0 w-12">Region</Label>
          <Select value={regionId || ALL_VALUE} onValueChange={(v) => { setRegionId(v === ALL_VALUE ? '' : v); setStateId(''); setLocationId(''); setTheatreId(''); }}>
            <SelectTrigger className="h-8 w-[120px] bg-white text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0 w-12">State</Label>
          <Select value={stateId || ALL_VALUE} onValueChange={(v) => { setStateId(v === ALL_VALUE ? '' : v); setLocationId(''); setTheatreId(''); }} disabled={!regionId && regions.length > 0}>
            <SelectTrigger className="h-8 w-[120px] bg-white text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All</SelectItem>
              {states.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0 w-10">City</Label>
          <Select value={locationId || ALL_VALUE} onValueChange={(v) => { setLocationId(v === ALL_VALUE ? '' : v); setTheatreId(''); }}>
            <SelectTrigger className="h-8 w-[120px] bg-white text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0 w-14">Theatre</Label>
          <Select value={theatreId || ALL_VALUE} onValueChange={(v) => setTheatreId(v === ALL_VALUE ? '' : v)}>
            <SelectTrigger className="h-8 w-[160px] bg-white text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All</SelectItem>
              {theatres.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.screenCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0 w-10">View</Label>
          <Select value={viewLevel} onValueChange={(v) => setViewLevel(v as 'theatre' | 'screen')}>
            <SelectTrigger className="h-8 w-[110px] bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="theatre">Theatre</SelectItem>
              <SelectItem value="screen">Screen</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-6 items-stretch min-w-0 w-full flex-1 min-h-0">
        <Card className="border bg-white overflow-hidden flex-1 min-w-0 shrink flex flex-col min-h-0">
          {/* Compact calendar bar: view + scroll at top right of calendar */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-b border-gray-200 bg-gray-50/80 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Select value={datePreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="h-8 w-[120px] bg-white text-sm border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-md border border-gray-200 bg-white p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded"
                  onClick={goPrev}
                  aria-label="Previous period"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded"
                  onClick={goNext}
                  aria-label="Next period"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {datePreset === 'custom' ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={customFrom || windowStart}
                    onChange={(e) => handleCustomFromChange(e.target.value)}
                    className="h-8 rounded border border-gray-200 px-2 text-xs w-[112px] bg-white"
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="date"
                    value={customTo || dateTo}
                    onChange={(e) => handleCustomToChange(e.target.value)}
                    className="h-8 rounded border border-gray-200 px-2 text-xs w-[112px] bg-white"
                  />
                </div>
              ) : (
                <span className="text-xs font-medium text-[#1e3a5f] min-w-[140px] text-right">
                  {dateFrom} → {dateTo}
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-gray-200" aria-hidden />
            <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('date')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'date'
                    ? 'bg-[#1e3a5f] text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                By date
              </button>
              <button
                type="button"
                onClick={() => setViewMode('time')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'time'
                    ? 'bg-[#1e3a5f] text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                By time
              </button>
            </div>
          </div>
          <CardContent className="p-0 flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
              </div>
            ) : viewMode === 'time' ? (
              <div className="min-w-0 overflow-x-auto flex-1">
                <TimeView
                  rows={rows}
                  displayDays={displayDays}
                  getProgrammesForCell={getProgrammesForCell}
                  getShowTimesForDay={getShowTimesForDay}
                  toYMD={toYMD}
                  uniqueTheatres={uniqueTheatres}
                  viewLevel={viewLevel}
                  onSelect={(item) => setSelectedItem(item)}
                  selectedItem={selectedItem}
                />
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0 flex-1">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead>
                    <tr className="border-b bg-[#1e3a5f]/5">
                      <th className="text-left p-3 font-semibold text-[#1e3a5f] w-[200px] sticky left-0 bg-white z-10 border-r">
                        {viewLevel === 'theatre' ? 'Theatre' : 'Screen (theatre)'}
                      </th>
                      {displayDays.map((day) => (
                        <th key={toYMD(day)} className="p-3 font-semibold text-[#1e3a5f] text-center min-w-[160px] border-r last:border-r-0">
                          <div className="text-sm">
                            {day.toLocaleDateString('en-IN', { weekday: 'short' })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueTheatres.length === 0 ? (
                      <tr>
                        <td colSpan={displayDays.length + 1} className="p-8 text-center text-muted-foreground">
                          No programmes in this range. Create a programme or change filters/date.
                        </td>
                      </tr>
                    ) : (
                      uniqueTheatres.map((row) => (
                        <tr key={row.theatreId} className="border-b hover:bg-gray-50/50">
                          <td className="p-3 sticky left-0 bg-white z-10 border-r font-medium text-[#1e3a5f]">
                            <button
                              type="button"
                              onClick={() => openTheatreDetail(row)}
                              className="text-left hover:bg-[#1e3a5f]/5 rounded px-1 -mx-1 py-0.5 -my-0.5 transition-colors w-full"
                              title="View theatre details: screens and movies"
                            >
                              <div className="text-sm font-semibold underline decoration-dashed decoration-[#1e3a5f]/50 truncate">{row.theatreName}</div>
                              <div className="text-xs text-muted-foreground">{row.locationName}</div>
                              {row.theatreScreenNames && row.theatreScreenNames.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {row.theatreScreenNames.map((name, idx) => {
                                    const c = AUDITORIUM_COLORS[idx % AUDITORIUM_COLORS.length];
                                    return (
                                      <span
                                        key={idx}
                                        className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium', c.chip)}
                                        title={`${name} (color matches calendar)`}
                                      >
                                        {name}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </button>
                          </td>
                          {displayDays.map((day) => {
                            const programmes = getProgrammesForCell(row.theatreId, day);
                            const dayYMD = toYMD(day);
                            const screenNames = row.theatreScreenNames ?? Array.from({ length: row.screenCount || 1 }, (_, i) => `Audi ${i + 1}`);
                            const screenCount = Math.max(screenNames.length, programmes.length, 1);
                            return (
                              <td key={dayYMD} className="p-2 align-top border-r last:border-r-0 min-w-[160px]">
                                <div className="flex flex-col gap-1.5">
                                  {Array.from({ length: screenCount }, (_, screenIdx) => {
                                    const p = programmes[screenIdx] ?? null;
                                    const screenName = screenNames[screenIdx] ?? `Audi ${screenIdx + 1}`;
                                    const c = AUDITORIUM_COLORS[screenIdx % AUDITORIUM_COLORS.length];
                                    const isSelected = selectedItem?.row.programmeId === p?.programmeId && selectedItem?.row.theatreId === row.theatreId && selectedItem?.dayYMD === dayYMD && selectedItem?.screenIndex === screenIdx;
                                    if (!p) {
                                      return (
                                        <div key={screenIdx} className={cn('rounded px-2 py-1.5 text-xs border-l-2 border-gray-200 bg-gray-50/50 text-muted-foreground')}>
                                          <span className="font-medium">{screenName}</span>
                                          <span className="ml-1">—</span>
                                        </div>
                                      );
                                    }
                                    const times = getShowTimesForDay(p, dayYMD);
                                    return (
                                      <button
                                        type="button"
                                        key={`${screenIdx}-${p.programmeId}-${p.theatreId}`}
                                        onClick={() => setSelectedItem({ row: p, dayYMD, screenIndex: screenIdx, screenName })}
                                        className={cn(
                                          'rounded px-2 py-1.5 text-xs border-l-4 text-left w-full transition-colors',
                                          c.card,
                                          isSelected && `ring-2 ${c.ring}`
                                        )}
                                        title={`${screenName}: ${p.movieTitle} · ${p.showsPerTheatre} shows`}
                                      >
                                        <div className="font-medium truncate text-gray-900" title={p.movieTitle}>
                                          {p.movieTitle}
                                        </div>
                                        <div className="text-muted-foreground">
                                          {p.showsPerTheatre} show{p.showsPerTheatre !== 1 ? 's' : ''}
                                        </div>
                                        {times.length > 0 && (
                                          <div className="mt-1 text-[10px] text-muted-foreground flex flex-wrap gap-x-1 gap-y-0.5" title={times.join(', ')}>
                                            <Clock className="h-3 w-3 inline shrink-0 mt-0.5" />
                                            {times.slice(0, 4).join(' · ')}
                                            {times.length > 4 && ` +${times.length - 4}`}
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {(theatreDetail || selectedItem) && (
          <div className="w-[320px] shrink-0 self-stretch flex flex-col min-h-0">
            {theatreDetail ? (
              <Card className="border bg-white shadow-lg flex flex-col h-full min-h-0">
                <CardHeader className="pb-2 flex flex-row items-center justify-between shrink-0">
                  <h3 className="text-sm font-semibold text-[#1e3a5f]">Theatre details</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setTheatreDetail(null); setTheatreSchedule(null); }} aria-label="Close">
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-0 space-y-3 overflow-y-auto flex-1 min-h-0">
                  <div>
                    <div className="font-medium text-gray-900">{theatreDetail.theatreName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {theatreDetail.locationName}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    For {dateFrom} — which movie runs on each screen
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
            ) : selectedItem ? (
              <Card className="border bg-white shadow-lg flex flex-col h-full min-h-0">
                <CardHeader className="pb-2 flex flex-row items-center justify-between shrink-0">
                  <h3 className="text-sm font-semibold text-[#1e3a5f]">Details</h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedItem(null)} aria-label="Close">
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-0 space-y-4 overflow-y-auto flex-1 min-h-0">
                  {selectedItem.screenName != null && (
                    <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm">
                      <p className="font-medium text-[#1e3a5f]">{selectedItem.screenName}</p>
                      <p className="text-muted-foreground mt-0.5">
                        Running {selectedItem.row.showsPerTheatre} show{selectedItem.row.showsPerTheatre !== 1 ? 's' : ''} of {selectedItem.row.movieTitle}
                      </p>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Film className="h-3.5 w-3.5" />
                      Movie
                    </div>
                    <p className="font-medium text-gray-900">{selectedItem.row.movieTitle}</p>
                    {selectedItem.row.movieLanguage && (
                      <p className="text-xs text-muted-foreground">{selectedItem.row.movieLanguage}</p>
                    )}
                    {selectedItem.row.durationMins != null && (
                      <p className="text-xs text-muted-foreground">{selectedItem.row.durationMins} min</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Venue
                    </div>
                    <p className="font-medium text-gray-900">{selectedItem.row.theatreName}</p>
                    <p className="text-xs text-muted-foreground">{selectedItem.row.locationName}</p>
                    {selectedItem.row.regionName && (
                      <p className="text-xs text-muted-foreground">{selectedItem.row.regionName} → {selectedItem.row.stateName}</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Date
                    </div>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedItem.dayYMD).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Programme: {selectedItem.row.startDate}
                      {selectedItem.row.endDate ? ` – ${selectedItem.row.endDate}` : ' onwards'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="h-3.5 w-3.5" />
                      Show times
                    </div>
                    <p className="text-sm text-gray-900">
                      {getShowTimesForDay(selectedItem.row, selectedItem.dayYMD).join(', ') || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedItem.row.showsPerTheatre} show{selectedItem.row.showsPerTheatre !== 1 ? 's' : ''} · TAT {selectedItem.row.tatMins} min
                      {selectedItem.row.timeSlotPattern && ` · ${selectedItem.row.timeSlotPattern}`}
                    </p>
                  </div>
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Capacity: {selectedItem.row.capacityUtilization} · {selectedItem.row.screenCount} screens
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>

    </div>
  );
}

function TimeView({
  rows,
  displayDays,
  getProgrammesForCell,
  getShowTimesForDay,
  toYMD,
  uniqueTheatres,
  viewLevel,
  onSelect,
  selectedItem,
}: {
  rows: ScheduleOverviewRow[];
  displayDays: Date[];
  getProgrammesForCell: (theatreId: string, day: Date) => ScheduleOverviewRow[];
  getShowTimesForDay: (p: ScheduleOverviewRow, dayYMD: string) => string[];
  toYMD: (d: Date) => string;
  uniqueTheatres: ScheduleOverviewRow[];
  viewLevel: string;
  onSelect: (item: SelectedItem) => void;
  selectedItem: SelectedItem;
}) {
  const day = displayDays[0];
  const dayYMD = day ? toYMD(day) : '';
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 6; h < 24; h++) {
      slots.push(`${h}:00`);
      slots.push(`${h}:30`);
    }
    slots.push('24:00');
    return slots;
  }, []);

  const getProgrammeAtTime = useCallback(
    (theatreId: string, slot: string): ScheduleOverviewRow | null => {
      if (!dayYMD) return null;
      const [h, m] = slot.split(':').map(Number);
      const slotStartMins = h * 60 + (m || 0);
      const slotEndMins = slotStartMins + 30;
      const programmes = getProgrammesForCell(theatreId, day);
      for (const p of programmes) {
        const times = getShowTimesForDay(p, dayYMD);
        const duration = p.durationMins ?? 120;
        for (const t of times) {
          const match = t.match(/(\d+):(\d+)\s*(AM|PM)/);
          if (!match) continue;
          let th = parseInt(match[1], 10);
          const tm = parseInt(match[2], 10);
          if (match[3] === 'PM' && th !== 12) th += 12;
          if (match[3] === 'AM' && th === 12) th = 0;
          const showStart = th * 60 + tm;
          if (slotStartMins >= showStart && slotStartMins < showStart + duration) return p;
        }
      }
      return null;
    },
    [day, dayYMD, getProgrammesForCell, getShowTimesForDay]
  );

  if (!day) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Select a date range to see time view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse">
        <thead>
          <tr className="border-b bg-[#1e3a5f]/5">
            <th className="text-left p-3 font-semibold text-[#1e3a5f] w-[200px] sticky left-0 bg-white z-10 border-r">
              {viewLevel === 'theatre' ? 'Theatre' : 'Screen (theatre)'}
            </th>
            {timeSlots.map((slot) => (
              <th key={slot} className="p-1.5 font-semibold text-[#1e3a5f] text-center text-xs min-w-[52px] border-r last:border-r-0">
                {slot}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {uniqueTheatres.length === 0 ? (
            <tr>
              <td colSpan={timeSlots.length + 1} className="p-8 text-center text-muted-foreground">
                No programmes on {dayYMD}.
              </td>
            </tr>
          ) : (
            uniqueTheatres.map((row) => (
              <tr key={row.theatreId} className="border-b hover:bg-gray-50/50">
                <td className="p-3 sticky left-0 bg-white z-10 border-r font-medium text-[#1e3a5f] text-sm">
                  <div>{row.theatreName}</div>
                  <div className="text-xs text-muted-foreground">{row.locationName}</div>
                </td>
                {timeSlots.map((slot) => {
                  const p = getProgrammeAtTime(row.theatreId, slot);
                  const isSelected = selectedItem?.row.programmeId === p?.programmeId && selectedItem?.row.theatreId === row.theatreId && selectedItem?.dayYMD === dayYMD;
                  return (
                    <td key={slot} className="p-0.5 align-top border-r last:border-r-0">
                      {p ? (
                        <button
                          type="button"
                          onClick={() => onSelect({ row: p, dayYMD })}
                          className={cn(
                            'w-full rounded px-1 py-1 text-[10px] font-medium truncate block text-left',
                            'bg-[#1e3a5f]/15 border border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/25',
                            isSelected && 'ring-2 ring-[#1e3a5f]'
                          )}
                          title={`${p.movieTitle} · ${getShowTimesForDay(p, dayYMD).join(', ')}`}
                        >
                          {p.movieTitle}
                        </button>
                      ) : (
                        <span className="block w-full h-6 text-muted-foreground/30">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground p-2 border-t bg-gray-50/50">
        Time view for {new Date(dayYMD).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}. Click a slot to see details.
      </p>
    </div>
  );
}
