'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

type Theater = { id: string; name: string };

export default function NewScreenPage() {
  const router = useRouter();
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [theater_id, setTheaterId] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ data: Theater[] }>('/api/theaters')
      .then((r) => setTheaters(r.data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/api/screens', {
        method: 'POST',
        body: JSON.stringify({
          theater_id,
          name,
          capacity: capacity ? parseInt(capacity, 10) : undefined,
        }),
      });
      router.push('/screens');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create screen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/screens" className="text-gray-600 hover:text-gray-900 mb-4 inline-block">← Screens</Link>
      <h1 className="text-2xl font-semibold mb-6">New screen</h1>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Theater *</label>
          <select
            value={theater_id}
            onChange={(e) => setTheaterId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          >
            <option value="">— Select —</option>
            {theaters.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Screen name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (seats)</label>
          <input
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
            {loading ? 'Creating…' : 'Create'}
          </button>
          <Link href="/screens" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
