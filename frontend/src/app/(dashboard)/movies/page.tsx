'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Film, Loader2, Plus, Search } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchMovies, type Movie } from '@/lib/programmeApi';

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [versionFilter, setVersionFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMovies();
        if (!cancelled) {
          setMovies(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Failed to load movies. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const languages = useMemo(
    () =>
      Array.from(
        new Set(
          movies
            .map((m) => m.language)
            .filter((lang): lang is string => Boolean(lang && lang.trim()))
        )
      ).sort(),
    [movies]
  );

  const genres = useMemo(
    () =>
      Array.from(
        new Set(
          movies
            .map((m) => m.genre)
            .filter((g): g is string => Boolean(g && g.trim()))
        )
      ).sort(),
    [movies]
  );

  const versions = useMemo(
    () =>
      Array.from(
        new Set(
          movies
            .map((m) => m.version)
            .filter((v): v is string => Boolean(v && v.trim()))
        )
      ).sort(),
    [movies]
  );

  const filteredMovies = useMemo(
    () =>
      movies.filter((movie) => {
        const query = search.trim().toLowerCase();
        if (query) {
          const titleMatch = movie.title.toLowerCase().includes(query);
          const genreMatch = (movie.genre ?? '').toLowerCase().includes(query);
          if (!titleMatch && !genreMatch) return false;
        }

        if (languageFilter !== 'all' && (movie.language ?? '') !== languageFilter) {
          return false;
        }

        if (genreFilter !== 'all' && (movie.genre ?? '') !== genreFilter) {
          return false;
        }

        if (versionFilter !== 'all' && (movie.version ?? '') !== versionFilter) {
          return false;
        }

        return true;
      }),
    [movies, search, languageFilter, genreFilter, versionFilter]
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <nav className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-[#1e3a5f]">
              Home
            </Link>
            <span aria-hidden>/</span>
            <span className="font-medium text-[#1e3a5f]">Movies</span>
          </nav>
          <h1 className="text-2xl font-semibold text-[#1e3a5f]">Movies catalogue</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Browse movies in your programming catalogue, filter by language or genre, and
            jump into scheduling.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/programme/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Create programme
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card className="bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1e3a5f]/10">
                <Film className="h-5 w-5 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1e3a5f]">Movie library</p>
                <p className="text-xs text-muted-foreground">
                  {movies.length > 0
                    ? `${movies.length} movie${movies.length === 1 ? '' : 's'} in catalogue`
                    : 'Movies are loaded from your programming backend.'}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="search"
                placeholder="Search by title or genre…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
              />
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Select
                value={languageFilter}
                onValueChange={setLanguageFilter}
                disabled={languages.length === 0}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All languages</SelectItem>
                  {languages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={genreFilter}
                onValueChange={setGenreFilter}
                disabled={genres.length === 0}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genres</SelectItem>
                  {genres.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={versionFilter}
                onValueChange={setVersionFilter}
                disabled={versions.length === 0}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All versions</SelectItem>
                  {versions.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#1e3a5f]" />
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="space-y-2 rounded-md border border-dashed border-gray-300 bg-gray-50/60 px-4 py-6 text-sm text-muted-foreground">
              <p className="font-medium text-[#1e3a5f]">No movies found</p>
              <p>
                If you&apos;re using the sample Indian dataset, run the backend seed to add
                movies:
                <code className="ml-1 rounded bg-white px-1.5 py-0.5 text-xs">
                  npm run db:seed-programming
                </code>
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Language</TableHead>
                  <TableHead className="hidden md:table-cell">Genre</TableHead>
                  <TableHead className="hidden md:table-cell">Version</TableHead>
                  <TableHead className="hidden lg:table-cell">Duration</TableHead>
                  <TableHead className="hidden lg:table-cell">Release</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovies.map((movie) => {
                  const releaseYear =
                    movie.releaseDate != null && movie.releaseDate !== ''
                      ? new Date(movie.releaseDate).getFullYear()
                      : null;

                  return (
                    <TableRow key={movie.id}>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#1e3a5f]">{movie.title}</span>
                          <span className="mt-0.5 text-xs text-muted-foreground md:hidden">
                            {[movie.language, movie.genre, movie.version]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {movie.language ?? '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {movie.genre ?? '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {movie.version ?? '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {movie.durationMins != null ? `${movie.durationMins} min` : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {releaseYear ? releaseYear : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href="/dashboard/programme/new">Schedule</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
