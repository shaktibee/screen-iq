'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import {
  fetchCinemaLocations,
  fetchSchedule,
  fetchReplacements,
  type CinemaLocation,
  type ScheduleRow,
  type ReplacementRow,
} from '@/lib/dashboardApi';

const DAY_OPTIONS = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
] as const;

export default function CinemaDashboardPage() {
  const [locations, setLocations] = useState<CinemaLocation[]>([]);
  const [locationId, setLocationId] = useState<string>('');
  const [day, setDay] = useState<string>('');
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [replacements, setReplacements] = useState<ReplacementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replacingRowId, setReplacingRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLocations = useCallback(async () => {
    try {
      const list = await fetchCinemaLocations();
      setLocations(list);
      if (list.length && !locationId) setLocationId(list[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load locations');
    }
  }, []);

  const loadScheduleAndReplacements = useCallback(async () => {
    if (!locationId) {
      setSchedule([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [sched, repl] = await Promise.all([
        fetchSchedule(locationId, day || undefined),
        fetchReplacements(),
      ]);
      setSchedule(sched);
      setReplacements(repl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedule');
      setSchedule([]);
      setReplacements([]);
    } finally {
      setLoading(false);
    }
  }, [locationId, day]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    if (locationId) loadScheduleAndReplacements();
    else setSchedule([]);
  }, [locationId, day, loadScheduleAndReplacements]);

  const handleSelectReplacement = (_replacement: ReplacementRow) => {
    setReplacingRowId(null);
  };

  const currentLocation = locations.find((l) => l.id === locationId);
  const title = currentLocation?.name ?? 'Select location';

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-[#1e3a5f] mb-6">{title}</h1>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-2 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2 w-56">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 w-48">
            <Label>Day</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="border bg-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium">Movie</TableHead>
                    <TableHead className="font-medium">Shows</TableHead>
                    <TableHead className="font-medium">Tickets Sold</TableHead>
                    <TableHead className="font-medium">Occupancy</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedule.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.movie}</TableCell>
                      <TableCell>{row.shows}</TableCell>
                      <TableCell>{row.ticketsSold}</TableCell>
                      <TableCell>{row.occupancy}%</TableCell>
                      <TableCell>{row.status ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                          onClick={() => setReplacingRowId(row.id)}
                        >
                          Make Changes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={replacingRowId !== null} onOpenChange={(open) => !open && setReplacingRowId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recommended Replacement</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium">Movie</TableHead>
                <TableHead className="font-medium">Occupancy</TableHead>
                <TableHead className="font-medium">Time</TableHead>
                <TableHead className="font-medium">Length</TableHead>
                <TableHead className="font-medium">Score</TableHead>
                <TableHead className="font-medium text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {replacements.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.movie}</TableCell>
                  <TableCell>{r.occupancy}%</TableCell>
                  <TableCell>{r.time}</TableCell>
                  <TableCell>{r.length}</TableCell>
                  <TableCell>{r.score}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                      onClick={() => handleSelectReplacement(r)}
                    >
                      Select
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
