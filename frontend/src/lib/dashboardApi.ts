/**
 * Dashboard API client (cinema dashboard, programming dashboard, reports).
 *
 * NOTE: Backend routes are mostly stubbed; these helpers focus on
 * returning the shapes the frontend expects so type-checking and
 * build succeed. Data will often be empty until the backend is filled in.
 */
import { api } from './api';

/**
 * ----- Reports -----
 */

export type ReportKpis = {
  expectedAdmits: number;
  actualAdmits: number;
  rebalancingMissed: number;
  totalRevenue: number;
};

export type ExpectedVsActualRow = {
  movie: string;
  day: string;
  before: number;
  after: number;
};

export type TopRebalancedMovie = {
  rank: number;
  name: string;
};

export type RebalancingMissedPoint = {
  day: string;
  missed: number;
};

export type LocationsByDayRow = {
  day: string;
  locations: { name: string; count: number }[];
};

export type ReportData = {
  kpis: ReportKpis;
  expectedVsActual: ExpectedVsActualRow[];
  topRebalancedMovies: TopRebalancedMovie[];
  rebalancingMissedLine: RebalancingMissedPoint[];
  locationsByDay: LocationsByDayRow[];
};

// Legacy helpers – kept for backwards compatibility
export async function getReportSummary(filters?: Record<string, string>) {
  const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
  return api<{ revenue: number; shows: number; utilization: number }>(`/api/reports/summary${params}`);
}

export async function getReportBreakdown(filters?: Record<string, string>) {
  const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
  return api<unknown[]>(`/api/reports/breakdown${params}`);
}

/**
 * Main reports entrypoint used by the dashboard.
 *
 * The current backend only returns very small summary/breakdown payloads,
 * so we adapt them into the richer `ReportData` shape expected by the UI.
 */
export async function fetchReportData(days: number): Promise<ReportData> {
  // We pass { days } as a filter so the backend can evolve later.
  const filters = { days: String(days) };
  const summary = await getReportSummary(filters);
  const _breakdown = await getReportBreakdown(filters);

  // For now, synthesize minimal, consistent data.
  const kpis: ReportKpis = {
    expectedAdmits: summary.shows ?? 0,
    actualAdmits: summary.shows ?? 0,
    rebalancingMissed: 0,
    totalRevenue: summary.revenue ?? 0,
  };

  return {
    kpis,
    expectedVsActual: [],
    topRebalancedMovies: [],
    rebalancingMissedLine: [],
    locationsByDay: [],
  };
}

/**
 * ----- Programming dashboard -----
 */

export type RebalanceRow = {
  id: string;
  movie: string;
  shows: number;
  ticketsSold: number;
  occupancy: number;
  status: 'Needs Rebalance' | 'Pending Approval' | 'Approved' | 'Rejected' | string;
};

export type CityBreakdownRow = {
  city: string;
  cinemas: number;
  moviesNeedingRebalancing: number;
};

// Legacy helper (list) – retained
export async function getProgrammingRebalance(query?: Record<string, string>) {
  const params = query ? `?${new URLSearchParams(query).toString()}` : '';
  return api<RebalanceRow[]>(`/api/programming/rebalance${params}`);
}

// Legacy helper (summary) – retained
export async function getProgrammingSummary(query?: Record<string, string>) {
  const params = query ? `?${new URLSearchParams(query).toString()}` : '';
  return api<{ showsNeedingRebalancing?: number; pendingApprovals?: number }>(`/api/programming/summary${params}`);
}

export async function fetchProgrammingCities(): Promise<string[]> {
  return api<string[]>('/api/programming/cities');
}

export async function fetchProgrammingTheatres(
  city: string
): Promise<{ id: string; name: string }[]> {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  const q = params.toString() ? `?${params.toString()}` : '';
  return api<{ id: string; name: string }[]>(`/api/programming/theatres${q}`);
}

export async function fetchRebalanceList(
  query?: { city?: string; theatre?: string; day?: string }
): Promise<RebalanceRow[]> {
  const params = query
    ? `?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(query).filter(([_, v]) => v != null && v !== '')
        )
      ).toString()}`
    : '';
  return api<RebalanceRow[]>(`/api/programming/rebalance${params}`);
}

export async function fetchProgrammingSummary(
  query?: { city?: string; theatre?: string; day?: string }
): Promise<{ showsNeedingRebalancing: number; pendingApprovals: number }> {
  const params = query
    ? `?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(query).filter(([_, v]) => v != null && v !== '')
        )
      ).toString()}`
    : '';
  const data = await api<{ showsNeedingRebalancing?: number; pendingApprovals?: number }>(
    `/api/programming/summary${params}`
  );
  return {
    showsNeedingRebalancing: data.showsNeedingRebalancing ?? 0,
    pendingApprovals: data.pendingApprovals ?? 0,
  };
}

export async function fetchCityBreakdown(
  query?: { city?: string; theatre?: string; day?: string }
): Promise<CityBreakdownRow[]> {
  const params = query
    ? `?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(query).filter(([_, v]) => v != null && v !== '')
        )
      ).toString()}`
    : '';
  return api<CityBreakdownRow[]>(`/api/programming/city-breakdown${params}`);
}

export async function approveRebalance(id: string): Promise<void> {
  await api(`/api/programming/rebalance/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'approve' }),
  });
}

export async function rejectRebalance(id: string): Promise<void> {
  await api(`/api/programming/rebalance/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'reject' }),
  });
}

/**
 * ----- Cinema dashboard -----
 */

export type CinemaLocation = {
  id: string;
  name: string;
  city?: string | null;
};

export type ScheduleRow = {
  id: string;
  movie: string;
  shows: number;
  ticketsSold: number;
  occupancy: number;
  status?: string | null;
};

export type ReplacementRow = {
  id: string;
  movie: string;
  occupancy: number;
  time: string;
  length: string;
  score: number;
};

export async function fetchCinemaLocations(): Promise<CinemaLocation[]> {
  return api<CinemaLocation[]>('/api/cinema/locations');
}

export async function fetchSchedule(
  locationId: string,
  day?: string
): Promise<ScheduleRow[]> {
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  // Backend expects `date`, but since it is a stub we just pass the
  // day string through when present.
  if (day) params.set('date', day);
  const q = params.toString() ? `?${params.toString()}` : '';
  return api<ScheduleRow[]>(`/api/cinema/schedule${q}`);
}

/**
 * Recommended replacements are not backed by an API yet.
 * We stub this client-side so the UI compiles and renders.
 */
export async function fetchReplacements(): Promise<ReplacementRow[]> {
  return [];
}
