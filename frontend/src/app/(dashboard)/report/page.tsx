'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  Calendar,
  Film,
  CalendarX,
  BarChart3,
  Clapperboard,
  Loader2,
} from 'lucide-react';
import { fetchReportData, type ReportData } from '@/lib/dashboardApi';

const DAY_COLORS: Record<string, string> = {
  Sun: '#f97316',
  Mon: '#15803d',
  Tue: '#0ea5e9',
  Wed: '#7c3aed',
  Thu: '#22c55e',
  Fri: '#eab308',
  Sat: '#1e3a5f',
};

const DAYS_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
];

function formatRevenue(n: number) {
  return `Rs. ${n.toLocaleString('en-IN')}`;
}

export default function ReportPage() {
  const [days, setDays] = useState<string>('7');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchReportData(Number(days))
      .then(setData)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load report');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [days]);

  const barSeriesArray = useMemo(() => {
    if (!data?.expectedVsActual?.length) return [];
    return data.expectedVsActual.reduce(
      (acc, row) => {
        const key = `${row.movie} - ${row.day}`;
        if (!acc[key]) acc[key] = { name: key, movie: row.movie, day: row.day, before: 0, after: 0 };
        acc[key].before = row.before;
        acc[key].after = row.after;
        return acc;
      },
      {} as Record<string, { name: string; movie: string; day: string; before: number; after: number }>
    );
  }, [data?.expectedVsActual]);
  const barSeriesList = Object.values(barSeriesArray);

  const kpis = data?.kpis ?? null;
  const topMovies = data?.topRebalancedMovies ?? [];
  const rebalancingMissedLine = data?.rebalancingMissedLine ?? [];
  const locationsByDay = data?.locationsByDay ?? [];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-[#1e3a5f]">Report</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl mx-auto">
          Real-time metrics to track the overall effectiveness of rebalancing activities — helping
          Programming and Leadership assess what&apos;s working, where interventions were missed,
          and the revenue outcomes.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-2 text-sm">
          {error}
          <span className="block mt-1 text-xs">Ensure you are logged in and the backend is running (e.g. npm run start in backend).</span>
        </div>
      )}

      <div className="flex justify-end">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[140px] bg-white border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#1e3a5f]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {DAYS_OPTIONS.find((o) => o.value === days)?.label ?? 'Last 7 days'}
                </span>
                <Calendar className="h-5 w-5 text-[#1e3a5f]" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Expected Admits</p>
                <p className="text-2xl font-semibold text-[#1e3a5f]">
                  {kpis ? kpis.expectedAdmits.toLocaleString() : '—'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {DAYS_OPTIONS.find((o) => o.value === days)?.label ?? 'Last 7 days'}
                </span>
                <Film className="h-5 w-5 text-[#1e3a5f]" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Actual Admits</p>
                <p className="text-2xl font-semibold text-[#1e3a5f]">
                  {kpis ? kpis.actualAdmits.toLocaleString() : '—'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {DAYS_OPTIONS.find((o) => o.value === days)?.label ?? 'Last 7 days'}
                </span>
                <CalendarX className="h-5 w-5 text-[#1e3a5f]" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Rebalancing Missed</p>
                <p className="text-2xl font-semibold text-[#1e3a5f]">
                  {kpis != null ? kpis.rebalancingMissed : '—'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {DAYS_OPTIONS.find((o) => o.value === days)?.label ?? 'Last 7 days'}
                </span>
                <BarChart3 className="h-5 w-5 text-[#1e3a5f]" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-semibold text-[#1e3a5f]">
                  {kpis ? formatRevenue(kpis.totalRevenue) : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {DAYS_OPTIONS.find((o) => o.value === days)?.label ?? 'Last 7 days'}
                </span>
                <Clapperboard className="h-8 w-8 text-[#1e3a5f]" />
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-[#1e3a5f] mb-3">Top Rebalanced Movies</h3>
                <ol className="space-y-2">
                  {topMovies.map((m) => (
                    <li key={m.rank} className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium w-6">{m.rank}.</span>
                      <span>{m.name}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {DAYS_OPTIONS.find((o) => o.value === days)?.label ?? 'Last 7 days'}
                </span>
                <CalendarX className="h-8 w-8 text-[#1e3a5f]" />
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-[#1e3a5f] mb-3">Rebalancing Missed</h3>
                <p className="text-4xl font-semibold text-[#1e3a5f]">
                  {kpis != null ? kpis.rebalancingMissed : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader>
                <CardContent className="p-0 pt-4">
                  <p className="font-semibold text-[#1e3a5f]">Expected Admits vs Actual Admits</p>
                </CardContent>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[280px] w-full">
                  {barSeriesList.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barSeriesList}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => {
                            const m = barSeriesList.find((x) => x.name === v);
                            return m ? `${m.movie} ${m.day}` : v;
                          }}
                        />
                        <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                        <Tooltip
                          formatter={(value: number | undefined) => [value ?? 0, 'Admits']}
                          labelFormatter={(_, payload) => payload[0]?.payload?.name}
                        />
                        <Legend />
                        <Bar dataKey="before" name="Sum of Admits (Before)" fill="#2563eb" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="after" name="Sum of Admits (After)" fill="#f97316" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      No chart data
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader>
                <CardContent className="p-0 pt-4">
                  <p className="font-semibold text-[#1e3a5f]">Rebalancing Missed</p>
                </CardContent>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[280px] w-full">
                  {rebalancingMissedLine.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rebalancingMissedLine} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="misses"
                          name="Misses"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ fill: '#2563eb' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      No chart data
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
            <CardHeader>
              <CardContent className="p-0">
                <p className="font-semibold text-[#1e3a5f]">Rebalancing Misses Across Locations</p>
              </CardContent>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(DAY_COLORS).map(([day, color]) => (
                  <span key={day} className="flex items-center gap-1.5 text-xs">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    {day}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {locationsByDay.map(({ day, locations }) => (
                  <div key={day} className="space-y-2">
                    <div
                      className="text-xs font-medium text-white px-2 py-1 rounded"
                      style={{ backgroundColor: DAY_COLORS[day] ?? '#64748b' }}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {locations.map((loc) => (
                        <div
                          key={loc.name}
                          className="flex items-center justify-between text-xs py-1.5 px-2 rounded border border-gray-200 bg-gray-50"
                        >
                          <span className="truncate pr-2" title={loc.name}>
                            {loc.name.replace(/^(Cinepolis|PVR|INOX)\s+/, '')}
                          </span>
                          <span className="font-medium text-[#1e3a5f] shrink-0">{loc.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
