'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
import { RefreshCw, ChevronDown, Hourglass, Loader2 } from 'lucide-react';
import {
  fetchProgrammingCities,
  fetchProgrammingTheatres,
  fetchRebalanceList,
  fetchProgrammingSummary,
  fetchCityBreakdown,
  approveRebalance,
  rejectRebalance,
  type RebalanceRow,
  type CityBreakdownRow,
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

export default function ProgrammingDashboardPage() {
  const [city, setCity] = useState<string>('');
  const [theatre, setTheatre] = useState<string>('');
  const [day, setDay] = useState<string>('');
  const [cities, setCities] = useState<string[]>([]);
  const [theatres, setTheatres] = useState<{ id: string; name: string }[]>([]);
  const [rebalanceData, setRebalanceData] = useState<RebalanceRow[]>([]);
  const [summary, setSummary] = useState<{ showsNeedingRebalancing: number; pendingApprovals: number }>({ showsNeedingRebalancing: 0, pendingApprovals: 0 });
  const [cityBreakdown, setCityBreakdown] = useState<CityBreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const params = { city: city || undefined, theatre: theatre || undefined, day: day || undefined };

  const loadCities = useCallback(async () => {
    try {
      const list = await fetchProgrammingCities();
      setCities(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cities');
    }
  }, []);

  const loadTheatres = useCallback(async () => {
    if (!city) {
      setTheatres([]);
      return;
    }
    try {
      const list = await fetchProgrammingTheatres(city);
      setTheatres(list);
    } catch (e) {
      setTheatres([]);
    }
  }, [city]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, sum, breakdown] = await Promise.all([
        fetchRebalanceList(params),
        fetchProgrammingSummary(params),
        fetchCityBreakdown(params),
      ]);
      setRebalanceData(list);
      setSummary(sum);
      setCityBreakdown(breakdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setRebalanceData([]);
      setSummary({ showsNeedingRebalancing: 0, pendingApprovals: 0 });
      setCityBreakdown([]);
    } finally {
      setLoading(false);
    }
  }, [params.city, params.theatre, params.day]);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  useEffect(() => {
    setTheatre('');
    loadTheatres();
  }, [city, loadTheatres]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (rowId: string) => {
    setActionId(rowId);
    try {
      await approveRebalance(rowId);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (rowId: string) => {
    setActionId(rowId);
    try {
      await rejectRebalance(rowId);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  const showActions = (status: RebalanceRow['status']) =>
    status === 'Needs Rebalance' || status === 'Pending Approval';

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div>
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
          <Link href="/dashboard" className="hover:text-[#1e3a5f]">Home</Link>
          <span aria-hidden>/</span>
          <span className="text-[#1e3a5f] font-medium">Programming Team</span>
        </nav>
        <h1 className="text-2xl font-semibold text-[#1e3a5f]">
          Dashboard – Programming Team
        </h1>
        <p className="text-gray-600 text-sm mt-0.5 max-w-2xl">
          Centralized view of all rebalancing requirements across cities, theatres, and days.
          Use filters to track and take immediate action on pending rebalancing requests.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Compact filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#2d4a6f]/20 bg-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0 w-10">City</Label>
          <Select value={city} onValueChange={(v) => { setCity(v); setTheatre(''); }}>
            <SelectTrigger className="h-8 w-[140px] bg-white text-sm">
              <SelectValue placeholder="Select city" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0 w-16">Theatre</Label>
          <Select value={theatre} onValueChange={setTheatre} disabled={!city}>
            <SelectTrigger className="h-8 w-[160px] bg-white text-sm">
              <SelectValue placeholder="Select theatre" />
            </SelectTrigger>
            <SelectContent>
              {theatres.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0 w-8">Day</Label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="h-8 w-[120px] bg-white text-sm">
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

      {/* Main rebalancing table */}
      <Card className="border bg-white shadow">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="font-medium">Movie</TableHead>
                  <TableHead className="font-medium">Shows</TableHead>
                  <TableHead className="font-medium">Tickets Sold</TableHead>
                  <TableHead className="font-medium">Occupancy</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rebalanceData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.movie}</TableCell>
                    <TableCell>{row.shows}</TableCell>
                    <TableCell>{row.ticketsSold}</TableCell>
                    <TableCell>{row.occupancy}%</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell className="text-right">
                      {showActions(row.status) ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-[#1e3a5f] hover:bg-[#2d4a6f]"
                            onClick={() => handleApprove(row.id)}
                            disabled={actionId === row.id}
                          >
                            {actionId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                            onClick={() => handleReject(row.id)}
                            disabled={actionId === row.id}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border bg-white shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Shows Needing Rebalancing</p>
                <p className="text-2xl font-semibold text-[#1e3a5f]">{summary.showsNeedingRebalancing}</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </CardContent>
        </Card>
        <Card className="border bg-white shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Hourglass className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Pending Approvals</p>
                <p className="text-2xl font-semibold text-[#1e3a5f]">{summary.pendingApprovals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* City-wise breakdown */}
      <Card className="border bg-white shadow">
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-900">City-wise breakdown</h2>
            <p className="text-sm text-gray-500">Movies needing rebalancing by city</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="font-medium">City</TableHead>
                <TableHead className="font-medium">Cinemas</TableHead>
                <TableHead className="font-medium">Movies needing rebalancing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cityBreakdown.map((row) => (
                <TableRow key={row.city}>
                  <TableCell className="font-medium">{row.city}</TableCell>
                  <TableCell>{row.cinemas}</TableCell>
                  <TableCell>{row.moviesNeedingRebalancing}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
