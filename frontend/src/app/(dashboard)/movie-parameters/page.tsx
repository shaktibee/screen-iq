'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { INDIAN_CITIES } from '@/data/indian-cities';
import { INDIAN_THEATRES, getTheatresByCity, type Theatre } from '@/data/indian-theatres';
import { INDIAN_MOVIES } from '@/data/indian-movies';
import {
  REMOVABLE_TIME_SLOTS,
  DAY_OPTIONS,
} from '@/data/time-slots';
import { cn } from '@/lib/utils';

type TheatreParams = {
  showLimit: number;
  removableSlot: string;
  days: string[];
  occupancy: number;
};

const defaultParams: TheatreParams = {
  showLimit: 6,
  removableSlot: '',
  days: [],
  occupancy: 30,
};

function TheatreRow({
  theatre,
  params,
  onUpdate,
}: {
  theatre: Theatre;
  params: TheatreParams;
  onUpdate: (field: keyof TheatreParams, value: number | string | string[]) => void;
}) {
  const toggleDay = (value: string) => {
    const next = params.days.includes(value)
      ? params.days.filter((d) => d !== value)
      : [...params.days, value];
    onUpdate('days', next);
  };
  const daysLabel =
    params.days.length === 0
      ? 'Select days'
      : params.days
          .sort(
            (a, b) =>
              DAY_OPTIONS.findIndex((d) => d.value === a) - DAY_OPTIONS.findIndex((d) => d.value === b)
          )
          .join(', ');

  return (
    <TableRow>
      <TableCell className="font-medium py-2 align-top">
        {theatre.name}
        {theatre.chain != null && theatre.chain !== '' && (
          <span className="text-muted-foreground font-normal"> ({theatre.chain})</span>
        )}
      </TableCell>
      <TableCell className="py-2 align-top">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium w-5">{params.showLimit}</span>
          <Slider
            value={[params.showLimit]}
            onValueChange={(v) => onUpdate('showLimit', v[0])}
            min={1}
            max={10}
            step={1}
            className="w-20 flex-1 min-w-0"
          />
        </div>
      </TableCell>
      <TableCell className="py-2 align-top">
        <Select
          value={params.removableSlot || undefined}
          onValueChange={(v) => onUpdate('removableSlot', v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Time slot" />
          </SelectTrigger>
          <SelectContent>
            {REMOVABLE_TIME_SLOTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2 align-top">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs justify-between font-normal w-full min-w-[100px]">
              {daysLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="flex flex-col gap-1">
              {DAY_OPTIONS.map((d) => (
                <label
                  key={d.value}
                  className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-accent text-sm"
                >
                  <Checkbox
                    checked={params.days.includes(d.value)}
                    onCheckedChange={() => toggleDay(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell className="py-2 align-top">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium w-7">{params.occupancy}%</span>
          <Slider
            value={[params.occupancy]}
            onValueChange={(v) => onUpdate('occupancy', v[0])}
            min={0}
            max={100}
            step={5}
            className="w-20 flex-1 min-w-0"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function DefaultParamsRow({
  showLimit,
  setShowLimit,
  removableSlot,
  setRemovableSlot,
  selectedDays,
  toggleDay,
  occupancy,
  setOccupancy,
}: {
  showLimit: number;
  setShowLimit: (v: number) => void;
  removableSlot: string;
  setRemovableSlot: (v: string) => void;
  selectedDays: string[];
  toggleDay: (value: string) => void;
  occupancy: number;
  setOccupancy: (v: number) => void;
}) {
  const daysLabel =
    selectedDays.length === 0
      ? 'Select days'
      : selectedDays
          .sort(
            (a, b) =>
              DAY_OPTIONS.findIndex((d) => d.value === a) - DAY_OPTIONS.findIndex((d) => d.value === b)
          )
          .join(', ');

  return (
    <TableRow>
      <TableCell className="font-medium py-2 align-top text-muted-foreground">
        All theatres
      </TableCell>
      <TableCell className="py-2 align-top">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium w-5">{showLimit}</span>
          <Slider
            value={[showLimit]}
            onValueChange={(v) => setShowLimit(v[0])}
            min={1}
            max={10}
            step={1}
            className="w-20 flex-1 min-w-0"
          />
        </div>
      </TableCell>
      <TableCell className="py-2 align-top">
        <Select value={removableSlot || undefined} onValueChange={setRemovableSlot}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Time slot" />
          </SelectTrigger>
          <SelectContent>
            {REMOVABLE_TIME_SLOTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2 align-top">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs justify-between font-normal w-full min-w-[100px]">
              {daysLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div className="flex flex-col gap-1">
              {DAY_OPTIONS.map((d) => (
                <label
                  key={d.value}
                  className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-accent text-sm"
                >
                  <Checkbox
                    checked={selectedDays.includes(d.value)}
                    onCheckedChange={() => toggleDay(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell className="py-2 align-top">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium w-7">{occupancy}%</span>
          <Slider
            value={[occupancy]}
            onValueChange={(v) => setOccupancy(v[0])}
            min={0}
            max={100}
            step={5}
            className="w-20 flex-1 min-w-0"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function MovieParametersPage() {
  const [city, setCity] = useState<string>('');
  const [movie, setMovie] = useState<string>('');
  const [theatreIds, setTheatreIds] = useState<string[]>([]);
  const [applySameParams, setApplySameParams] = useState(false);
  const [showLimit, setShowLimit] = useState([6]);
  const [removableSlot, setRemovableSlot] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [occupancy, setOccupancy] = useState([30]);
  const [theatreParams, setTheatreParams] = useState<Record<string, TheatreParams>>({});
  const [saved, setSaved] = useState(false);

  const toggleDay = (value: string) => {
    setSelectedDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  const theatresForCity = useMemo(
    () => (city ? getTheatresByCity(city) : []),
    [city]
  );

  const selectedTheatres = useMemo(
    () => theatresForCity.filter((t) => theatreIds.includes(t.id)),
    [theatresForCity, theatreIds]
  );

  const toggleTheatre = (id: string) => {
    setTheatreIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Seed per-theater params when switching to table view or when selected theatres change
  useEffect(() => {
    if (applySameParams || theatreIds.length === 0) return;
    const global: TheatreParams = {
      showLimit: showLimit[0],
      removableSlot,
      days: [...selectedDays],
      occupancy: occupancy[0],
    };
    setTheatreParams((prev) => {
      const next = { ...prev };
      theatreIds.forEach((id) => {
        if (!next[id]) next[id] = { ...global };
      });
      return next;
    });
  }, [applySameParams, theatreIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTheatreParam = (id: string, field: keyof TheatreParams, value: number | string | string[]) => {
    setTheatreParams((prev) => ({
      ...prev,
      [id]: { ...defaultParams, ...prev[id], [field]: value },
    }));
  };

  const getTheatreParam = (id: string): TheatreParams => {
    return { ...defaultParams, ...theatreParams[id] };
  };

  const showTable = !applySameParams && selectedTheatres.length > 0;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className={cn('max-w-5xl space-y-8', showTable && 'max-w-5xl')}>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#1e3a5f]">Movie Parameters</h1>
        <p className="text-sm text-muted-foreground">
          Configure show limits, time slots, days, and occupancy by city and theatre.
        </p>
      </header>

      <Card className="border border-gray-200 bg-white shadow-sm">
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-sm font-medium text-muted-foreground">City</Label>
              <Select value={city} onValueChange={(v) => { setCity(v); setTheatreIds([]); }}>
                <SelectTrigger id="city" className="w-full bg-white">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Theatres</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                    disabled={!city}
                  >
                    {theatreIds.length === 0
                      ? 'Select theatres'
                      : `${theatreIds.length} theatres selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
                  {theatresForCity.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Select a city first.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                      {theatresForCity.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-accent"
                        >
                          <Checkbox
                            checked={theatreIds.includes(t.id)}
                            onCheckedChange={() => toggleTheatre(t.id)}
                          />
                          <span className="text-sm">{t.name}</span>
                          {t.chain && (
                            <span className="text-xs text-muted-foreground">({t.chain})</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="movie" className="text-sm font-medium text-muted-foreground">Movie</Label>
              <Select value={movie} onValueChange={setMovie}>
                <SelectTrigger id="movie" className="w-full bg-white">
                  <SelectValue placeholder="Select movie" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_MOVIES.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                      {m.year ? ` (${m.year})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="border border-gray-200 bg-gray-50/50">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="apply-same" className="cursor-pointer text-sm font-medium">
                  Apply same parameters
                </Label>
                <Switch
                  id="apply-same"
                  checked={applySameParams}
                  onCheckedChange={setApplySameParams}
                />
              </div>

              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[140px] font-medium text-muted-foreground">Theatre</TableHead>
                      <TableHead className="w-[100px] font-medium text-muted-foreground">Show limit</TableHead>
                      <TableHead className="min-w-[160px] font-medium text-muted-foreground">Time slot</TableHead>
                      <TableHead className="min-w-[120px] font-medium text-muted-foreground">Days</TableHead>
                      <TableHead className="w-[120px] font-medium text-muted-foreground">Occupancy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showTable ? (
                      selectedTheatres.map((theatre) => (
                        <TheatreRow
                          key={theatre.id}
                          theatre={theatre}
                          params={getTheatreParam(theatre.id)}
                          onUpdate={(field, value) => updateTheatreParam(theatre.id, field, value)}
                        />
                      ))
                    ) : (
                      <DefaultParamsRow
                        showLimit={showLimit[0]}
                        setShowLimit={(v) => setShowLimit([v])}
                        removableSlot={removableSlot}
                        setRemovableSlot={setRemovableSlot}
                        selectedDays={selectedDays}
                        toggleDay={toggleDay}
                        occupancy={occupancy[0]}
                        setOccupancy={(v) => setOccupancy([v])}
                      />
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              className={cn(
                'bg-gray-900 hover:bg-gray-800 text-white',
                saved && 'bg-green-600 hover:bg-green-700'
              )}
            >
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
