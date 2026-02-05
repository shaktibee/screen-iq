'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

type Project = {
  id: string;
  name: string;
  release_date: string | null;
  language: string | null;
  regions: string[] | null;
  duration_mins: number | null;
  genre: string | null;
  versions: string[] | null;
  week_start: string | null;
  censor_certificate?: string | null;
  entry_mins?: number | null;
  ent_com_mins?: number | null;
  ent_trl_mins?: number | null;
  int_com_mins?: number | null;
  int_slides_mins?: number | null;
  int_trl_mins?: number | null;
  hk_mins?: number | null;
  turnaround_total_mins?: number | null;
  turnaround_in_hrs?: string | null;
};

type Factors = {
  is_franchise: boolean;
  genre_buzz: number;
  actor_buzz: number;
  lead_actor_performance: number;
  language_population_pct: number;
  social_buzz: number;
  advance_booking_pct: number;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [factors, setFactors] = useState<Factors | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [factorsSaving, setFactorsSaving] = useState(false);
  const [factorsForm, setFactorsForm] = useState<Factors>({
    is_franchise: false,
    genre_buzz: 0,
    actor_buzz: 0,
    lead_actor_performance: 0,
    language_population_pct: 0,
    social_buzz: 0,
    advance_booking_pct: 0,
  });

  useEffect(() => {
    api<Project>(`/api/projects/${params.id}`)
      .then((p) => {
        setProject(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    api<Factors>(`/api/programming/factors?projectId=${params.id}`)
      .then((f) => {
        if (f) {
          setFactors(f);
          setFactorsForm({
            is_franchise: f.is_franchise ?? false,
            genre_buzz: Number(f.genre_buzz) || 0,
            actor_buzz: Number(f.actor_buzz) || 0,
            lead_actor_performance: Number(f.lead_actor_performance) || 0,
            language_population_pct: Number(f.language_population_pct) || 0,
            social_buzz: Number(f.social_buzz) || 0,
            advance_booking_pct: Number(f.advance_booking_pct) || 0,
          });
        }
      })
      .catch(() => {});
  }, [params.id]);

  const saveFactors = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!params.id) return;
    setFactorsSaving(true);
    try {
      await api(`/api/programming/factors/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(factorsForm),
      });
      setFactors(factorsForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save factors');
    } finally {
      setFactorsSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (error && !project) return <p className="text-red-600">{error}</p>;
  if (!project) return null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/projects" className="text-gray-600 hover:text-gray-900">← Projects</Link>
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
      </div>
      <h1 className="text-2xl font-semibold mb-4">{project.name}</h1>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-gray-500">Release date</dt>
        <dd>{project.release_date || '—'}</dd>
        <dt className="text-gray-500">Language</dt>
        <dd>{project.language || '—'}</dd>
        <dt className="text-gray-500">Regions</dt>
        <dd>{project.regions?.length ? project.regions.join(', ') : '—'}</dd>
        <dt className="text-gray-500">Duration</dt>
        <dd>{project.duration_mins != null ? `${project.duration_mins} min` : '—'}</dd>
        <dt className="text-gray-500">Genre</dt>
        <dd>{project.genre || '—'}</dd>
        <dt className="text-gray-500">Versions</dt>
        <dd>{project.versions?.length ? project.versions.join(', ') : '—'}</dd>
        <dt className="text-gray-500">Week start (slate)</dt>
        <dd>{project.week_start || '—'}</dd>
        {project.censor_certificate != null && (
          <>
            <dt className="text-gray-500">Censor certificate</dt>
            <dd>{project.censor_certificate}</dd>
          </>
        )}
      </dl>

      {(project.entry_mins != null || project.turnaround_total_mins != null || project.hk_mins != null) && (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Turn Around Time (minutes)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Entry</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Ent. Com.</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Ent. Trl.</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Film</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Int com.</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Int. slides</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Int. Trl.</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">HK</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Total</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">In Hrs</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2 border-t">{project.entry_mins ?? 0}</td>
                  <td className="px-3 py-2 border-t">{project.ent_com_mins ?? 0}</td>
                  <td className="px-3 py-2 border-t">{project.ent_trl_mins ?? 0}</td>
                  <td className="px-3 py-2 border-t">{project.duration_mins ?? 0}</td>
                  <td className="px-3 py-2 border-t">{project.int_com_mins ?? 0}</td>
                  <td className="px-3 py-2 border-t">{project.int_slides_mins ?? 0}</td>
                  <td className="px-3 py-2 border-t">{project.int_trl_mins ?? 0}</td>
                  <td className="px-3 py-2 border-t">{project.hk_mins ?? 0}</td>
                  <td className="px-3 py-2 border-t font-medium">{project.turnaround_total_mins ?? '—'}</td>
                  <td className="px-3 py-2 border-t">{project.turnaround_in_hrs ?? '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-3">Influencing factors</h2>
        <p className="text-sm text-gray-500 mb-3">
          Present Buzz: Social buzz, Advance booking. Historical: Franchise, Genre buzz, Actor buzz, Lead actor performance, Language population %.
        </p>
        <form onSubmit={saveFactors} className="max-w-lg space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={factorsForm.is_franchise}
              onChange={(e) => setFactorsForm((f) => ({ ...f, is_franchise: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Part of franchise</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'genre_buzz', label: 'Genre buzz (0–100)' },
              { key: 'actor_buzz', label: 'Actor buzz (0–100)' },
              { key: 'lead_actor_performance', label: 'Lead actor past perf (0–100)' },
              { key: 'language_population_pct', label: 'Language population %' },
              { key: 'social_buzz', label: 'Social media buzz (0–100)' },
              { key: 'advance_booking_pct', label: 'Advance booking %' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500">{label}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={typeof factorsForm[key as keyof Factors] === 'number' ? (factorsForm[key as keyof Factors] as number) : 0}
                  onChange={(e) =>
                    setFactorsForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={factorsSaving}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
          >
            {factorsSaving ? 'Saving…' : 'Save factors'}
          </button>
        </form>
      </div>

      <div className="mt-6 flex gap-4">
        <Link
          href={`/projects/${params.id}/upload`}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Upload data
        </Link>
        <Link
          href={`/projects/${params.id}/shows`}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
        >
          Shows
        </Link>
      </div>
    </div>
  );
}
