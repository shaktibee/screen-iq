'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function getWeekStart(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export default function NewProjectPage() {
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [language, setLanguage] = useState('');
  const [regions, setRegions] = useState('');
  const [durationMins, setDurationMins] = useState('');
  const [genre, setGenre] = useState('');
  const [versions, setVersions] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const ws = searchParams.get('weekStart');
    if (ws) setWeekStart(ws);
    else setWeekStart(getWeekStart(new Date()));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const project = await api<{ id: string }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          release_date: releaseDate || undefined,
          language: language || undefined,
          regions: regions ? regions.split(',').map((r) => r.trim()).filter(Boolean) : undefined,
          duration_mins: durationMins ? parseInt(durationMins, 10) : undefined,
          genre: genre || undefined,
          versions: versions ? versions.split(',').map((v) => v.trim()).filter(Boolean) : undefined,
          week_start: weekStart || undefined,
        }),
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/projects" className="text-gray-600 hover:text-gray-900 mb-4 inline-block">← Projects</Link>
      <h1 className="text-2xl font-semibold mb-6">New project</h1>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Release date</label>
          <input
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <input
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Regions (comma-separated)</label>
          <input
            type="text"
            value={regions}
            onChange={(e) => setRegions(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="IN, NCR, MH, KA"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
          <input
            type="number"
            min={1}
            value={durationMins}
            onChange={(e) => setDurationMins(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="120"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Action, Comedy, Drama"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Versions (comma-separated)</label>
          <input
            type="text"
            value={versions}
            onChange={(e) => setVersions(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="2D, 3D, IMAX"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Week start (for slate)</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create project'}
        </button>
      </form>
    </div>
  );
}
