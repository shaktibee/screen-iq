'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  fetchRegions,
  fetchStates,
  fetchLocations,
  fetchTheatres,
  fetchMovies,
  createProgramme,
  type Region,
  type State,
  type Location,
  type Theatre,
  type Movie,
  type ProgrammeTheatreInput,
} from '@/lib/programmeApi';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Location & Theatres', short: 'Locations' },
  { id: 2, title: 'Movie', short: 'Movie' },
  { id: 3, title: 'Show allocation', short: 'Shows' },
  { id: 4, title: 'Version & language', short: 'Version' },
  { id: 5, title: 'Schedule & TAT', short: 'Schedule' },
];

const CAPACITY_OPTIONS = [
  { value: 'max', label: 'Max' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'low', label: 'Low' },
];

const TIME_SLOT_OPTIONS = [
  { value: 'linear', label: 'Linear (spread across day)' },
  { value: 'evening-heavy', label: 'Evening-heavy' },
  { value: 'art-house', label: 'Art house / festival' },
];

const LANGUAGES = ['Hindi', 'English', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Bengali', 'Marathi'];

export default function NewProgrammePage() {
  const [step, setStep] = useState(1);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [theatresLoading, setTheatresLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movieSearch, setMovieSearch] = useState('');
  const [movieOpen, setMovieOpen] = useState(false);

  const [form, setForm] = useState<{
    movieIds: string[];
    regionIds: string[];
    stateIds: string[];
    locationIds: string[];
    theatreIds: string[];
    selectedTheatres: ProgrammeTheatreInput[];
    showsPerTheatre: number;
    showsPerScreen: number;
    capacityUtilization: 'max' | 'moderate' | 'low';
    versionRatio2d: number;
    versionRatio3d: number;
    versionRatioImax: number;
    languages: string[];
    startDate: string;
    endDate: string;
    timeSlotPattern: 'linear' | 'evening-heavy' | 'art-house';
    tatMins: number;
  }>({
    movieIds: [],
    regionIds: [],
    stateIds: [],
    locationIds: [],
    theatreIds: [],
    selectedTheatres: [],
    showsPerTheatre: 4,
    showsPerScreen: 2,
    capacityUtilization: 'moderate',
    versionRatio2d: 70,
    versionRatio3d: 20,
    versionRatioImax: 10,
    languages: ['Hindi'],
    startDate: '',
    endDate: '',
    timeSlotPattern: 'linear',
    tatMins: 50,
  });

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [moviesRes, regionsRes] = await Promise.all([fetchMovies(), fetchRegions()]);
      setMovies(moviesRes);
      setRegions(regionsRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!form.regionIds.length) {
      setStates([]);
      return;
    }
    Promise.all(form.regionIds.map((id) => fetchStates(id)))
      .then((arrays) => setStates(arrays.flat()))
      .catch(() => setStates([]));
  }, [form.regionIds.join(',')]);

  useEffect(() => {
    if (!form.stateIds.length) {
      setLocations([]);
      return;
    }
    Promise.all(form.stateIds.map((id) => fetchLocations(id)))
      .then((arrays) => setLocations(arrays.flat()))
      .catch(() => setLocations([]));
  }, [form.stateIds.join(',')]);

  useEffect(() => {
    if (!form.locationIds.length && !form.stateIds.length && !form.regionIds.length) {
      setTheatres([]);
      setTheatresLoading(false);
      return;
    }
    setTheatresLoading(true);
    const load = async () => {
      const all: Theatre[] = [];
      try {
        if (form.locationIds.length) {
          const arrays = await Promise.all(form.locationIds.map((id) => fetchTheatres(id)));
          arrays.forEach((arr) => arr.forEach((t) => all.push(t)));
        }
        if (form.stateIds.length) {
          const arrays = await Promise.all(form.stateIds.map((id) => fetchTheatres(undefined, id)));
          arrays.forEach((arr) => arr.forEach((t) => all.push(t)));
        }
        if (form.regionIds.length) {
          const arrays = await Promise.all(form.regionIds.map((id) => fetchTheatres(undefined, undefined, id)));
          arrays.forEach((arr) => arr.forEach((t) => all.push(t)));
        }
        const seen = new Set<string>();
        setTheatres(all.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true))));
      } catch {
        setTheatres([]);
      } finally {
        setTheatresLoading(false);
      }
    };
    load();
  }, [form.locationIds.join(','), form.stateIds.join(','), form.regionIds.join(',')]);

  const filteredMovies = movieSearch.trim()
    ? movies.filter((m) => m.title.toLowerCase().includes(movieSearch.toLowerCase()))
    : movies;

  const selectedMovies = movies.filter((m) => form.movieIds.includes(m.id));

  const toggleRegion = (id: string) => {
    setForm((f) => ({
      ...f,
      regionIds: f.regionIds.includes(id) ? f.regionIds.filter((x) => x !== id) : [...f.regionIds, id],
      stateIds: [],
      locationIds: [],
      theatreIds: [],
      selectedTheatres: [],
    }));
  };
  const toggleState = (id: string) => {
    setForm((f) => ({
      ...f,
      stateIds: f.stateIds.includes(id) ? f.stateIds.filter((x) => x !== id) : [...f.stateIds, id],
      locationIds: [],
      theatreIds: [],
      selectedTheatres: [],
    }));
  };
  const toggleLocation = (id: string) => {
    setForm((f) => ({
      ...f,
      locationIds: f.locationIds.includes(id) ? f.locationIds.filter((x) => x !== id) : [...f.locationIds, id],
      theatreIds: [],
      selectedTheatres: [],
    }));
  };
  const toggleTheatre = (t: Theatre) => {
    setForm((f) => {
      const has = f.theatreIds.includes(t.id);
      const nextTheatreIds = has ? f.theatreIds.filter((id) => id !== t.id) : [...f.theatreIds, t.id];
      const nextSelected = has
        ? f.selectedTheatres.filter((x) => x.theatreId !== t.id)
        : [...f.selectedTheatres, { theatreId: t.id, showsPerTheatre: f.showsPerTheatre, showsPerScreen: f.showsPerScreen, capacityUtilization: f.capacityUtilization }];
      return { ...f, theatreIds: nextTheatreIds, selectedTheatres: nextSelected };
    });
  };

  const selectAllTheatres = () => {
    const toAdd = theatres.filter((t) => !form.theatreIds.includes(t.id));
    if (toAdd.length === 0) return;
    setForm((f) => {
      const nextTheatreIds = [...f.theatreIds, ...toAdd.map((t) => t.id)];
      const nextSelected = [
        ...f.selectedTheatres,
        ...toAdd.map((t) => ({
          theatreId: t.id,
          showsPerTheatre: f.showsPerTheatre,
          showsPerScreen: f.showsPerScreen,
          capacityUtilization: f.capacityUtilization,
        })),
      ];
      return { ...f, theatreIds: nextTheatreIds, selectedTheatres: nextSelected };
    });
  };

  const handleSubmit = async () => {
    if (form.movieIds.length === 0 || form.selectedTheatres.length === 0 || !form.startDate) {
      setError('Please select at least one movie, at least one theatre, and a start date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const movieId of form.movieIds) {
        await createProgramme({
          movieId,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          timeSlotPattern: form.timeSlotPattern,
          tatMins: form.tatMins,
          theatres: form.selectedTheatres.map((t) => ({
            theatreId: t.theatreId,
            showsPerTheatre: t.showsPerTheatre ?? form.showsPerTheatre,
            showsPerScreen: t.showsPerScreen ?? form.showsPerScreen,
            capacityUtilization: t.capacityUtilization ?? form.capacityUtilization,
            versionRatio2d: form.versionRatio2d,
            versionRatio3d: form.versionRatio3d,
            versionRatioImax: form.versionRatioImax,
            languages: form.languages,
          })),
        });
      }
      window.location.href = '/dashboard';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create programme');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
            <Link href="/dashboard" className="hover:text-[#1e3a5f]">Home</Link>
            <span aria-hidden>/</span>
            <span className="text-[#1e3a5f] font-medium">Create programme</span>
          </nav>
          <h1 className="text-2xl font-semibold text-[#1e3a5f]">Create new programme</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Schedule a movie across locations and theatres.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-white p-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition',
              step === s.id ? 'bg-[#1e3a5f] text-white' : 'text-muted-foreground hover:bg-gray-100'
            )}
          >
            {s.short}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card className="border bg-white">
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1e3a5f]">{STEPS.find((s) => s.id === step)?.title}</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Regions</Label>
                <div className="flex flex-wrap gap-2">
                  {regions.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 rounded border px-3 py-2">
                      <Checkbox checked={form.regionIds.includes(r.id)} onCheckedChange={() => toggleRegion(r.id)} />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
              {states.length > 0 && (
                <div className="space-y-2">
                  <Label>States</Label>
                  <div className="flex flex-wrap gap-2">
                    {states.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 rounded border px-3 py-2">
                        <Checkbox checked={form.stateIds.includes(s.id)} onCheckedChange={() => toggleState(s.id)} />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {locations.length > 0 && (
                <div className="space-y-2">
                  <Label>Locations (cities)</Label>
                  <div className="flex flex-wrap gap-2">
                    {locations.map((l) => (
                      <label key={l.id} className="flex items-center gap-2 rounded border px-3 py-2">
                        <Checkbox checked={form.locationIds.includes(l.id)} onCheckedChange={() => toggleLocation(l.id)} />
                        {l.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Theatres — select at least one</Label>
                <p className="text-xs text-muted-foreground">
                  Select one or more regions (or states/cities) above to load theatres. Then choose the theatres where this programme will run.
                </p>
                {!form.regionIds.length && !form.stateIds.length && !form.locationIds.length ? (
                  <p className="text-sm text-muted-foreground rounded-md border border-dashed border-gray-300 bg-gray-50/50 px-3 py-4">
                    Select at least one region, state, or city above to see theatres.
                  </p>
                ) : theatresLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-md border border-gray-200 bg-gray-50/50 px-3 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading theatres…
                  </div>
                ) : theatres.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-md border border-amber-200 bg-amber-50/50 px-3 py-4">
                    No theatres found for this selection. If you use Indian regions, run the backend seed: <code className="text-xs bg-white px-1 py-0.5 rounded">npm run db:seed-programming</code>
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllTheatres}
                      >
                        Select all ({theatres.length} theatres)
                      </Button>
                      {form.theatreIds.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {form.theatreIds.length} selected
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto rounded-md border bg-gray-50/30 p-2">
                      {theatres.map((t) => (
                        <label
                          key={t.id}
                          className={cn(
                            'flex items-center gap-2 rounded border px-3 py-2 cursor-pointer transition-colors',
                            form.theatreIds.includes(t.id)
                              ? 'border-[#1e3a5f] bg-[#1e3a5f]/10'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          )}
                        >
                          <Checkbox checked={form.theatreIds.includes(t.id)} onCheckedChange={() => toggleTheatre(t)} />
                          <span className="text-sm font-medium">{t.name}</span>
                          {t.locationName && (
                            <span className="text-xs text-muted-foreground">({t.locationName})</span>
                          )}
                          <span className="text-xs text-muted-foreground">· {t.screenCount} screens</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {form.regionIds.length === 0 && form.stateIds.length === 0 && (
                <p className="text-sm text-muted-foreground">Select at least one region to see states, cities, and theatres.</p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Movies (newest first)</Label>
                <Popover open={movieOpen} onOpenChange={setMovieOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      {selectedMovies.length === 0
                        ? 'Search and select movies'
                        : selectedMovies
                            .map((m) =>
                              m.releaseDate
                                ? `${m.title} (${new Date(m.releaseDate).getFullYear()})`
                                : m.title
                            )
                            .join(', ')}
                      <Search className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <div className="border-b p-2">
                      <input
                        placeholder="Type to search..."
                        value={movieSearch}
                        onChange={(e) => setMovieSearch(e.target.value)}
                        className="w-full rounded border bg-transparent px-2 py-1.5 text-sm outline-none"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredMovies.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-muted-foreground">
                          {movies.length === 0
                            ? 'No movies found. Run the database seed (backend: npm run db:seed-programming) to add movies.'
                            : 'No matches for your search.'}
                        </p>
                      ) : (
                        filteredMovies.map((m) => {
                          const checked = form.movieIds.includes(m.id);
                          return (
                            <label
                              key={m.id}
                              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  setForm((f) => ({
                                    ...f,
                                    movieIds: checked
                                      ? f.movieIds.filter((id) => id !== m.id)
                                      : [...f.movieIds, m.id],
                                  }))
                                }
                              />
                              <span>
                                {m.title}
                                {m.releaseDate && (
                                  <span className="ml-2 text-muted-foreground">
                                    ({new Date(m.releaseDate).getFullYear()})
                                  </span>
                                )}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {selectedMovies.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedMovies.length} movie{selectedMovies.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Shows per theatre (default)</Label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.showsPerTheatre}
                    onChange={(e) => setForm((f) => ({ ...f, showsPerTheatre: Number(e.target.value) || 1 }))}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shows per screen (default)</Label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.showsPerScreen}
                    onChange={(e) => setForm((f) => ({ ...f, showsPerScreen: Number(e.target.value) || 1 }))}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Screen capacity utilization</Label>
                <Select
                  value={form.capacityUtilization}
                  onValueChange={(v) => setForm((f) => ({ ...f, capacityUtilization: v as 'max' | 'moderate' | 'low' }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPACITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.selectedTheatres.length > 0 && (
                <div className="rounded border p-3">
                  <p className="mb-2 text-sm font-medium">Selected theatres: {form.selectedTheatres.length}</p>
                  <p className="text-xs text-muted-foreground">Defaults above apply unless you change them per theatre in the next step.</p>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="space-y-2">
                <Label>Version ratio (2D / 3D / IMAX) %</Label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-xs">2D</Label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.versionRatio2d}
                      onChange={(e) => setForm((f) => ({ ...f, versionRatio2d: Number(e.target.value) || 0 }))}
                      className="w-full rounded-md border px-3 py-2"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">3D</Label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.versionRatio3d}
                      onChange={(e) => setForm((f) => ({ ...f, versionRatio3d: Number(e.target.value) || 0 }))}
                      className="w-full rounded-md border px-3 py-2"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">IMAX</Label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.versionRatioImax}
                      onChange={(e) => setForm((f) => ({ ...f, versionRatioImax: Number(e.target.value) || 0 }))}
                      className="w-full rounded-md border px-3 py-2"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <label key={lang} className="flex items-center gap-2 rounded border px-3 py-2">
                      <Checkbox
                        checked={form.languages.includes(lang)}
                        onCheckedChange={() =>
                          setForm((f) => ({
                            ...f,
                            languages: f.languages.includes(lang) ? f.languages.filter((x) => x !== lang) : [...f.languages, lang],
                          }))
                        }
                      />
                      {lang}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start date (programme live date) *</Label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date (optional)</Label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Time slot pattern</Label>
                <Select value={form.timeSlotPattern} onValueChange={(v) => setForm((f) => ({ ...f, timeSlotPattern: v as typeof form.timeSlotPattern }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>TAT — Turn Around Time (minutes between shows)</Label>
                <input
                  type="number"
                  min={45}
                  max={90}
                  value={form.tatMins}
                  onChange={(e) => setForm((f) => ({ ...f, tatMins: Number(e.target.value) || 50 }))}
                  className="w-full max-w-xs rounded-md border px-3 py-2"
                />
                <p className="text-xs text-muted-foreground">Typically 45–55 min (movie + ads + cleaning). Nationally applied.</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        {step < 5 ? (
          <Button onClick={() => setStep((s) => Math.min(5, s + 1))}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create programme
          </Button>
        )}
      </div>
    </div>
  );
}
