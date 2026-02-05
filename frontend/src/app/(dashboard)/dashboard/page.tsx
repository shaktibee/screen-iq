'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ScheduleCalendar } from '@/components/ScheduleCalendar';
import { MoviesByLocationsTable } from '@/components/MoviesByLocationsTable';
import type { MoviesByLocationsData } from '@/components/MoviesByLocationsTable';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

type Theater = { id: string; name: string; city: string | null };

type Kpis = {
  totalScreens: number;
  totalShows: number;
  avgOccupancyPct: number | null;
  avgTicketPrice: number | null;
};

type ScheduleRow = {
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

type SlateItem = {
  id: string;
  name: string;
  release_date: string | null;
  language: string | null;
  duration_mins: number | null;
  genre: string | null;
  versions: string[] | null;
  week_start: string | null;
};

type AlertData = {
  missingTitleCity: { title: string; city: string }[];
  whitespaceScreens: { screen: string; theater: string; city: string }[];
};

type ReRelease = {
  lowPerformingWeeks: { week_start: string; avg_occupancy_pct: number | null; show_count: number }[];
  recommendedReReleases: { title: string; genre: string | null; reason: string }[];
};

type GenreItem = { genre: string; count: number; pct: number };
type SlotItem = { slot: string; count: number };

const SHOW_DISTRIBUTION_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;
const SLOT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
type TopTitle = { title: string; sold: number; occupancyPct: number | null };

type CapacityAllocationRow = {
  project_id: string;
  movie: string;
  shows: number;
  movie_length: number | null;
  capacity_allocated: number;
  capacity_pct: number;
  demand_estimated: number | null;
  demand_pct: number | null;
  recommendation: string | null;
  occ_pct: number | null;
};

type CapacityAllocationData = {
  weekStart: string;
  weekEnd: string;
  totalShows: number;
  totalCapacityAllocated: number;
  rows: CapacityAllocationRow[];
};

function getWeekStart(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function formatWeekLabel(weekStart: string) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function DashboardPage() {
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [slate, setSlate] = useState<SlateItem[]>([]);
  const [alerts, setAlerts] = useState<AlertData | null>(null);
  const [reRelease, setReRelease] = useState<ReRelease | null>(null);
  const [genreBreakdown, setGenreBreakdown] = useState<GenreItem[]>([]);
  const [showDistribution, setShowDistribution] = useState<SlotItem[]>([]);
  const [topTitles, setTopTitles] = useState<TopTitle[]>([]);
  const [capacityAllocation, setCapacityAllocation] = useState<CapacityAllocationData | null>(null);
  const [moviesByLocations, setMoviesByLocations] = useState<MoviesByLocationsData | null>(null);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [selectedTheaterId, setSelectedTheaterId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'today' | 'weekly' | 'monthly'>('weekly');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedShow, setSelectedShow] = useState<ScheduleRow | null>(null);
  const [calendarDay, setCalendarDay] = useState(0); // 0 = Mon, 6 = Sun
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const theaterParam = selectedTheaterId ? `&theaterId=${selectedTheaterId}` : '';
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    const week = weekStart;
    try {
      const [kpiRes, schedRes, slateRes, alertRes, reRes, genreRes, distRes, topRes, capRes, moviesLocRes] = await Promise.all([
        api<Kpis>(`/api/programming/kpis?weekStart=${week}`),
        api<{ schedule: ScheduleRow[] }>(`/api/programming/schedule?weekStart=${week}${theaterParam}`),
        api<{ slate: SlateItem[] }>(`/api/programming/slate?weekStart=${week}`),
        api<AlertData>(`/api/programming/alerts?weekStart=${week}`),
        api<ReRelease>('/api/programming/re-release'),
        api<GenreItem[]>(`/api/programming/genre-breakdown?weekStart=${week}`),
        api<SlotItem[]>(`/api/programming/show-distribution?weekStart=${week}`),
        api<TopTitle[]>(`/api/programming/top-titles?weekStart=${week}`),
        api<CapacityAllocationData>(`/api/programming/capacity-allocation?weekStart=${week}${theaterParam}`),
        api<MoviesByLocationsData>(`/api/programming/movies-by-locations?weekStart=${week}${theaterParam}`),
      ]);
      setKpis(kpiRes);
      setSchedule(Array.isArray(schedRes.schedule) ? schedRes.schedule : []);
      setSlate(Array.isArray(slateRes.slate) ? slateRes.slate : []);
      setAlerts(alertRes);
      setReRelease(reRes);
      setGenreBreakdown(Array.isArray(genreRes) ? genreRes : []);
      setShowDistribution(Array.isArray(distRes) ? distRes : []);
      setTopTitles(Array.isArray(topRes) ? topRes : []);
      setCapacityAllocation(capRes ?? null);
      setMoviesByLocations(moviesLocRes ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [weekStart, selectedTheaterId]);

  useEffect(() => {
    api<{ data: Theater[] }>('/api/theaters?limit=100')
      .then((r) => setTheaters(r.data || []))
      .catch(() => setTheaters([]));
  }, []);

  useEffect(() => {
    if (viewMode === 'today' && selectedDate) {
      const d = new Date(selectedDate);
      setWeekStart(getWeekStart(d));
      setCalendarDay(d.getDay() === 0 ? 6 : d.getDay() - 1);
    }
  }, [viewMode, selectedDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const orgId = typeof window !== 'undefined' ? localStorage.getItem('organizationId') : '';
      const res = await fetch(`${base}/api/programming/export?weekStart=${weekStart}&format=${format}`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Organization-Id': orgId || '' },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schedule.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Loading dashboard…</p>
      </div>
    );
  }

  const isNoOrg = error.toLowerCase().includes('no organization');
  if (error && !kpis) {
    return (
      <div className={`rounded-lg border p-4 ${isNoOrg ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        <p className="font-medium">{error}</p>
        {isNoOrg && (
          <p className="mt-2 text-sm">
            Select an organization or sign up to create one. Ensure the backend is running.
          </p>
        )}
        {!isNoOrg && (
          <button
            type="button"
            onClick={() => { setError(''); fetchAll(); }}
            className="mt-3 text-sm px-3 py-1.5 bg-white border border-amber-300 rounded hover:bg-amber-100"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  const weekOptions: string[] = [];
  for (let i = -4; i <= 2; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i * 7);
    weekOptions.push(getWeekStart(d));
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{error}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setError(''); fetchAll(); }}
              className="text-sm px-3 py-1 bg-amber-100 hover:bg-amber-200 rounded"
            >
              Try again
            </button>
            <button type="button" onClick={() => setError('')} className="text-sm text-amber-600 hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Movie Programming Dashboard</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Week of:</label>
          <select
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {weekOptions.map((w) => (
              <option key={w} value={w}>
                {formatWeekLabel(w)}
              </option>
            ))}
          </select>
          <Link
            href={`/projects/new?weekStart=${weekStart}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            + Add New Show / Title
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Download XLSX
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Automated Programming Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-4">
          <h2 className="font-semibold text-gray-900">Automated Programming Schedule</h2>
          <select
            value={selectedTheaterId ?? ''}
            onChange={(e) => setSelectedTheaterId(e.target.value || null)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[200px]"
          >
            <option value="">All theatres</option>
            {theaters.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.city ? `, ${t.city}` : ''}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['today', 'weekly', 'monthly'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 text-sm font-medium capitalize ${
                  viewMode === mode ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          {viewMode === 'today' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          )}
          {viewMode === 'weekly' && (
            <span className="text-sm text-gray-500">
              {formatWeekLabel(weekStart)} · Day: Mon–Sun
            </span>
          )}
          {viewMode === 'monthly' && (
            <span className="text-sm text-gray-500">
              {new Date(weekStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>
        <div className="flex flex-col lg:flex-row min-h-0">
          {/* Left: Theatre / Screen tree */}
          <div className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50/50 p-3 overflow-y-auto max-h-[280px] lg:max-h-[520px]">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Screens</p>
            {schedule.length === 0 ? (
              <p className="text-sm text-gray-500">No shows this period.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {Array.from(
                  schedule.reduce((acc, row) => {
                    const key = `${row.theater_name ?? ''}|${row.screen_name ?? ''}`;
                    if (!acc.has(key)) acc.set(key, { theater: row.theater_name ?? '—', screen: row.screen_name ?? '—', title: row.title ?? '—' });
                    return acc;
                  }, new Map<string, { theater: string; screen: string; title: string }>())
                ).map(([key, v]) => (
                  <li key={key} className="py-1 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-700">{v.theater}</span>
                    <span className="block text-gray-600 truncate" title={`${v.screen} — ${v.title}`}>
                      {v.screen} — {v.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Center: Calendar */}
          <div className="flex-1 min-w-0">
            <ScheduleCalendar
              schedule={schedule}
              weekStart={weekStart}
              dayOffset={calendarDay}
              onDayChange={setCalendarDay}
              onShowClick={setSelectedShow}
              selectedShowId={selectedShow?.id ?? null}
            />
          </div>
          {/* Right: Details panel */}
          <div className="lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 bg-gray-50/30 p-4 overflow-y-auto">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Show details</p>
            {selectedShow ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-900">{selectedShow.title || selectedShow.show_name || '—'}</p>
                  <p className="text-sm text-gray-600">
                    {[selectedShow.theater_name, selectedShow.screen_name].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Expected occupancy</p>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-600 rounded-full"
                      style={{ width: `${Math.min(100, selectedShow.occupancy_pct ?? 0)}%` }}
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-1">{selectedShow.occupancy_pct ?? 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Ticket price</p>
                  <p className="text-sm text-gray-900">
                    {selectedShow.ticket_price != null ? `₹${Number(selectedShow.ticket_price).toFixed(0)}` : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Regular · Premium / VIP can be added per screen.</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Click a show in the schedule to see details.</p>
            )}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800"
          >
            Validate
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            Simulate
          </button>
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            Publish
          </button>
          <span className="text-xs text-gray-400 ml-2">Draft schedule · Run validate then publish when ready.</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Screens</p>
          <p className="text-2xl font-semibold text-gray-900">{kpis?.totalScreens ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Shows</p>
          <p className="text-2xl font-semibold text-gray-900">{kpis?.totalShows ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Average Occupancy</p>
          <p className="text-2xl font-semibold text-gray-900">
            {kpis?.avgOccupancyPct != null ? `${kpis.avgOccupancyPct}%` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Avg. Ticket Price</p>
          <p className="text-2xl font-semibold text-gray-900">
            {kpis?.avgTicketPrice != null ? `₹${kpis.avgTicketPrice.toFixed(0)}` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule + Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <h2 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">Schedule overview (Theatre × Screen)</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Movie</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Screen</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Showtimes</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                        No shows this week. Add shows from a project.
                      </td>
                    </tr>
                  ) : (
                    Array.from(
                      schedule.reduce((acc, row) => {
                        const key = `${row.theater_name ?? ''}|${row.screen_name ?? ''}|${row.title ?? ''}|${row.id}`;
                        if (!acc.has(key)) acc.set(key, []);
                        acc.get(key)!.push(row);
                        return acc;
                      }, new Map<string, ScheduleRow[]>())
                    ).map(([key, rows]) => {
                      const r = rows[0];
                      const times = rows
                        .map((x) => new Date(x.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
                        .join(', ');
                      const occ = r.occupancy_pct ?? 0;
                      const barColor = occ >= 70 ? 'bg-green-500' : occ >= 40 ? 'bg-amber-500' : 'bg-blue-600';
                      const screenLabel = [r.theater_name, r.screen_name].filter(Boolean).join(' — ') || '—';
                      return (
                        <tr key={key} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{r.title || '—'}</td>
                          <td className="px-4 py-2">{screenLabel}</td>
                          <td className="px-4 py-2">{times}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor}`} style={{ width: `${Math.min(100, occ)}%` }} />
                              </div>
                              <span>{occ}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <h2 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">Alerts</h2>
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-amber-800">Missing Title × City combinations</h3>
                {alerts?.missingTitleCity?.length ? (
                  <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                    {alerts.missingTitleCity.slice(0, 10).map((a, i) => (
                      <li key={i}>{a.title} × {a.city}</li>
                    ))}
                    {alerts.missingTitleCity.length > 10 && (
                      <li>… and {alerts.missingTitleCity.length - 10} more</li>
                    )}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">None detected.</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-800">Whitespaces (First Mover Advantage)</h3>
                {alerts?.whitespaceScreens?.length ? (
                  <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                    {alerts.whitespaceScreens.slice(0, 10).map((s, i) => (
                      <li key={i}>{s.theater} — {s.screen} ({s.city})</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">No empty screens this week.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Top titles, Genre, Show dist, Re-release */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="font-medium text-gray-900 mb-3">Top performing movies</h2>
            {topTitles.length === 0 ? (
              <p className="text-sm text-gray-500">No data this week.</p>
            ) : (
              <ul className="space-y-2">
                {topTitles.map((t, i) => (
                  <li key={`${t.title}-${i}`} className="flex items-center gap-2">
                    <span className="text-gray-400 w-5">{i + 1}.</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{t.title}</span>
                        <span>{t.occupancyPct != null ? `${t.occupancyPct}%` : '—'}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-0.5">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, t.occupancyPct ?? 0)}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="font-medium text-gray-900 mb-3">Genre breakdown</h2>
            {genreBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No data this week.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {genreBreakdown.map((g) => (
                  <div key={g.genre} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `hsl(${genreBreakdown.indexOf(g) * 100 % 360}, 60%, 50%)` }}
                    />
                    <span className="text-sm">{g.genre} {g.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="font-medium text-gray-900 mb-3">Show distribution</h2>
            {showDistribution.length === 0 ? (
              <p className="text-sm text-gray-500">No data this week.</p>
            ) : (
              <>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={SHOW_DISTRIBUTION_SLOTS.map((slot) => {
                          const item = showDistribution.find((s) => s.slot === slot);
                          return { name: slot, value: item?.count ?? 0 };
                        })}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => (value > 0 ? `${name} ${value}` : '')}
                      >
                        {SHOW_DISTRIBUTION_SLOTS.map((_, i) => (
                          <Cell key={i} fill={SLOT_COLORS[i]} stroke="white" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | undefined) => [`${value ?? 0} shows`, 'Shows']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  {SHOW_DISTRIBUTION_SLOTS.map((slot) => {
                    const item = showDistribution.find((s) => s.slot === slot);
                    const count = item?.count ?? 0;
                    return (
                      <div key={slot} className="flex justify-between">
                        <span>{slot}</span>
                        <span className="font-medium">{count} shows</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <h2 className="font-medium text-gray-900 mb-3">Re-release recommendations</h2>
            <p className="text-xs text-gray-500 mb-2">Insight-driven recommendations for low-performing weeks.</p>
            {reRelease?.lowPerformingWeeks?.length ? (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700">Low-performing weeks</p>
                <ul className="text-sm text-gray-600 mt-1 space-y-0.5">
                  {reRelease.lowPerformingWeeks.map((w) => (
                    <li key={w.week_start ?? ''}>
                      {w.week_start ? new Date(w.week_start).toLocaleDateString() : '—'} — {w.avg_occupancy_pct ?? '—'}% avg occupancy
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {reRelease?.recommendedReReleases?.length ? (
              <ul className="text-sm text-gray-600 space-y-1">
                {reRelease.recommendedReReleases.map((r, i) => (
                  <li key={`${r.title}-${i}`}>
                    <span className="font-medium">{r.title}</span> — {r.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                {reRelease ? 'Add more titles and show history for recommendations.' : 'Loading…'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Capacity Allocation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <h2 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">Capacity Allocation</h2>
        <div className="overflow-x-auto">
          {!capacityAllocation ? (
            <p className="p-4 text-sm text-gray-500">Loading…</p>
          ) : capacityAllocation.rows.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No allocation data for this week. Add shows to see capacity by movie.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Movie</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Shows</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Movie Length</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Capacity Allocated</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">%</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600 bg-amber-100">Demand Estimated</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600 bg-amber-100">%</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Reco</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Occ %</th>
                </tr>
              </thead>
              <tbody>
                {capacityAllocation.rows.map((row, i) => (
                  <tr
                    key={row.project_id}
                    className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-rose-50/40' : 'bg-white'}`}
                  >
                    <td className="px-4 py-2 font-medium text-gray-900">{row.movie}</td>
                    <td className="px-4 py-2 text-right">{row.shows}</td>
                    <td className="px-4 py-2 text-right">{row.movie_length != null ? row.movie_length : '—'}</td>
                    <td className="px-4 py-2 text-right">{row.capacity_allocated.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.capacity_pct}%</td>
                    <td className="px-4 py-2 text-right bg-amber-50">
                      {row.demand_estimated != null ? row.demand_estimated.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-right bg-amber-50">
                      {row.demand_pct != null ? `${row.demand_pct}%` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      {row.recommendation ? (
                        <span
                          className={
                            row.recommendation === 'increase'
                              ? 'text-emerald-600 font-medium'
                              : 'text-amber-600 font-medium'
                          }
                        >
                          {row.recommendation}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.occ_pct != null ? `${row.occ_pct.toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-medium border-t-2 border-gray-200">
                  <td className="px-4 py-2 text-gray-900">TOTAL</td>
                  <td className="px-4 py-2 text-right">{capacityAllocation.totalShows}</td>
                  <td className="px-4 py-2 text-right">—</td>
                  <td className="px-4 py-2 text-right">{capacityAllocation.totalCapacityAllocated.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">100%</td>
                  <td className="px-4 py-2 text-right bg-amber-100">—</td>
                  <td className="px-4 py-2 text-right bg-amber-100">—</td>
                  <td className="px-4 py-2">—</td>
                  <td className="px-4 py-2 text-right">—</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <MoviesByLocationsTable data={moviesByLocations} />

      {/* Input: Weekly slate (titles with Title, Language, Versions, Duration, Genre) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <h2 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">
          Weekly slate — Input: Title, Language, Versions, Duration, Genre
        </h2>
        <div className="p-4">
          <p className="text-sm text-gray-500 mb-3">
            Manage titles for this week. Add new titles from <Link href="/projects/new" className="text-blue-600 hover:underline">Movies</Link> and set their week to include them in the slate. Edit influencing factors per title from the project page.
          </p>
          {slate.length === 0 ? (
            <p className="text-sm text-gray-500">No titles in this week&apos;s slate. Add projects with week set to this week.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {slate.map((t) => (
                <li key={t.id} className="py-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-gray-500">{t.language ?? '—'}</span>
                  <span className="text-gray-500">{t.genre ?? '—'}</span>
                  <span className="text-gray-500">{t.duration_mins != null ? `${t.duration_mins} min` : '—'}</span>
                  <span className="text-gray-500">{t.versions?.length ? t.versions.join(', ') : '—'}</span>
                  <Link href={`/projects/${t.id}`} className="text-blue-600 hover:underline">Edit / Factors</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
