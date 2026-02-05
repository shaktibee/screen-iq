'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

type Theater = { id: string; name: string };
type Screen = { id: string; theater_id: string; name: string; capacity: number | null };

export default function EditScreenPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [theater_id, setTheaterId] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Screen>(`/api/screens/${id}`)
      .then((s) => {
        setScreen(s);
        setTheaterId(s.theater_id);
        setName(s.name);
        setCapacity(s.capacity != null ? String(s.capacity) : '');
      })
      .catch((e) => setError(e.message));
    api<{ data: Theater[] }>('/api/theaters').then((r) => setTheaters(r.data)).catch(() => {});
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screen) return;
    setError('');
    setLoading(true);
    try {
      await api(`/api/screens/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          theater_id,
          name,
          capacity: capacity ? parseInt(capacity, 10) : null,
        }),
      });
      router.push('/screens');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update screen');
    } finally {
      setLoading(false);
    }
  };

  if (error && !screen) return <p className="text-red-600">{error}</p>;
  if (!screen) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <Link href="/screens" className="text-gray-600 hover:text-gray-900 mb-4 inline-block">← Screens</Link>
      <h1 className="text-2xl font-semibold mb-6">Edit screen</h1>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Theater *</label>
          <select value={theater_id} onChange={(e) => setTheaterId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" required>
            {theaters.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Screen name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (seats)</label>
          <input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save'}
          </button>
          <Link href="/screens" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
