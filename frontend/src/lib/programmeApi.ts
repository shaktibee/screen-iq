/**
 * API client for programme (scheduling) module.
 */
import { api } from './api';

export type Region = { id: string; name: string };
export type State = { id: string; name: string; region_id: string };
export type Location = { id: string; name: string; state_id: string };
export type Theatre = {
  id: string;
  name: string;
  chain: string | null;
  screenCount: number;
  capabilities: { '2D'?: boolean; '3D'?: boolean; IMAX?: boolean };
  locationId: string;
  locationName: string;
};
export type Movie = {
  id: string;
  title: string;
  releaseDate: string | null;
  language: string | null;
  durationMins: number | null;
  version: string | null;
  genre: string | null;
};

export type ProgrammeTheatreInput = {
  theatreId: string;
  showsPerTheatre?: number;
  showsPerScreen?: number;
  capacityUtilization?: 'max' | 'moderate' | 'low';
  versionRatio2d?: number;
  versionRatio3d?: number;
  versionRatioImax?: number;
  languages?: string[];
};

export type CreateProgrammeInput = {
  movieId: string;
  startDate: string;
  endDate?: string | null;
  timeSlotPattern?: 'linear' | 'evening-heavy' | 'art-house';
  tatMins?: number;
  theatres: ProgrammeTheatreInput[];
};

export function fetchRegions(): Promise<Region[]> {
  return api<Region[]>('/api/programme/regions');
}

export function fetchStates(regionId?: string): Promise<State[]> {
  const q = regionId ? `?regionId=${encodeURIComponent(regionId)}` : '';
  return api<State[]>(`/api/programme/states${q}`);
}

export function fetchLocations(stateId?: string, regionId?: string): Promise<Location[]> {
  const params = new URLSearchParams();
  if (stateId) params.set('stateId', stateId);
  if (regionId) params.set('regionId', regionId);
  const q = params.toString() ? `?${params.toString()}` : '';
  return api<Location[]>(`/api/programme/locations${q}`);
}

export function fetchTheatres(locationId?: string, stateId?: string, regionId?: string): Promise<Theatre[]> {
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (stateId) params.set('stateId', stateId);
  if (regionId) params.set('regionId', regionId);
  const q = params.toString() ? `?${params.toString()}` : '';
  return api<Theatre[]>(`/api/programme/theatres${q}`);
}

export function fetchMovies(): Promise<Movie[]> {
  return api<Movie[]>('/api/programme/movies');
}

export function createProgramme(data: CreateProgrammeInput): Promise<{ id: string; startDate: string; endDate: string | null; createdAt: string }> {
  return api<{ id: string; startDate: string; endDate: string | null; createdAt: string }>('/api/programme', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Schedule overview / calendar: one row per (programme, theatre) in date range */
export type ScheduleOverviewRow = {
  programmeId: string;
  startDate: string;
  endDate: string | null;
  timeSlotPattern: string;
  tatMins: number;
  movieId: string;
  movieTitle: string;
  durationMins: number | null;
  movieLanguage: string | null;
  theatreId: string;
  theatreName: string;
  screenCount: number;
  /** Audi/screen names for this theatre (e.g. ["Audi 1", "Audi 2"]) */
  theatreScreenNames?: string[] | null;
  showsPerTheatre: number;
  showsPerScreen: number;
  capacityUtilization: string;
  locationId: string;
  locationName: string;
  stateId: string;
  stateName: string;
  regionId: string | null;
  regionName: string | null;
};

export type ScheduleOverviewParams = {
  // Newer API params (used by schedule-overview page)
  startDate?: string;
  endDate?: string;
  regionIds?: string;
  locationIds?: string;
  theatreIds?: string;
  // Backwards-compatible aliases used by fetchScheduleOverview
  dateFrom?: string;
  dateTo?: string;
  regionId?: string;
  stateId?: string;
  locationId?: string;
  theatreId?: string;
};

export function fetchScheduleOverview(
  params: ScheduleOverviewParams = {}
): Promise<ScheduleOverviewRow[]> {
  const search = new URLSearchParams();

  const dateFrom = params.dateFrom ?? params.startDate;
  const dateTo = params.dateTo ?? params.endDate;
  if (dateFrom) search.set('dateFrom', dateFrom);
  if (dateTo) search.set('dateTo', dateTo);

  const regionId = params.regionId ?? params.regionIds;
  const locationId = params.locationId ?? params.locationIds;
  const theatreId = params.theatreId ?? params.theatreIds;

  if (regionId) search.set('regionId', regionId);
  if (params.stateId) search.set('stateId', params.stateId);
  if (locationId) search.set('locationId', locationId);
  if (theatreId) search.set('theatreId', theatreId);
  const q = search.toString() ? `?${search.toString()}` : '';
  return api<ScheduleOverviewRow[]>(`/api/programme${q}`);
}

/** Calendar view item used by the schedule overview page (alias of ScheduleOverviewRow). */
export type CalendarItem = ScheduleOverviewRow;

export function fetchCalendar(
  params: ScheduleOverviewParams = {}
): Promise<CalendarItem[]> {
  return fetchScheduleOverview(params);
}

/** Theatre detail: screens and which movie runs on each screen for a given date */
export type TheatreScheduleScreen = {
  id: string;
  name: string;
  programme: {
    programmeId: string;
    movieId: string;
    movieTitle: string;
    startDate: string;
    endDate: string | null;
    durationMins: number | null;
  } | null;
};

export type TheatreScheduleResponse = {
  theatre: { id: string; name: string; screenCount: number; locationName: string };
  screens: TheatreScheduleScreen[];
};

export function fetchTheatreSchedule(
  theatreId: string,
  date: string
): Promise<TheatreScheduleResponse> {
  const q = `?date=${encodeURIComponent(date)}`;
  return api<TheatreScheduleResponse>(`/api/programme/theatres/${encodeURIComponent(theatreId)}/schedule${q}`);
}
