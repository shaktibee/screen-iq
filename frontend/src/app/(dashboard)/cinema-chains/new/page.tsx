'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function NewCinemaChainPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/api/cinema-chains', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      router.push('/cinema-chains');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cinema chain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Link href="/cinema-chains" className="text-gray-600 hover:text-gray-900 mb-4 inline-block">← Cinema chains</Link>
      <h1 className="text-2xl font-semibold mb-6">New cinema chain</h1>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
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
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create'}
          </button>
          <Link href="/cinema-chains" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
