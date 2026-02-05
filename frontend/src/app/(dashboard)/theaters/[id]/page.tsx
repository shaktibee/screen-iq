'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

type Region = { id: string; name: string };
type Chain = { id: string; name: string };
type Theater = {
  id: string;
  name: string;
  cinema_chain_id: string | null;
  region_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

export default function EditTheaterPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const [regions, setRegions] = useState<Region[]>([]);
  const [chains, setChains] = useState<Chain[]>([]);
  const [theater, setTheater] = useState<Theater | null>(null);
  const [name, setName] = useState('');
  const [cinema_chain_id, setCinemaChainId] = useState('');
  const [region_id, setRegionId] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Theater>(`/api/theaters/${id}`)
      .then((t) => {
        setTheater(t);
        setName(t.name);
        setCinemaChainId(t.cinema_chain_id || '');
        setRegionId(t.region_id || '');
        setAddress(t.address || '');
        setCity(t.city || '');
        setState(t.state || '');
        setCountry(t.country || '');
      })
      .catch((e) => setError(e.message));
    Promise.all([
      api<{ data: Region[] }>('/api/regions').then((r) => setRegions(r.data)),
      api<{ data: Chain[] }>('/api/cinema-chains').then((r) => setChains(r.data)),
    ]).catch(() => {});
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theater) return;
    setError('');
    setLoading(true);
    try {
      await api(`/api/theaters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          cinema_chain_id: cinema_chain_id || null,
          region_id: region_id || null,
          address: address || null,
          city: city || null,
          state: state || null,
          country: country || null,
        }),
      });
      router.push('/theaters');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update theater');
    } finally {
      setLoading(false);
    }
  };

  if (error && !theater) return <p className="text-red-600">{error}</p>;
  if (!theater) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <Link href="/theaters" className="text-gray-600 hover:text-gray-900 mb-4 inline-block">← Theaters</Link>
      <h1 className="text-2xl font-semibold mb-6">Edit theater</h1>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cinema chain</label>
            <select value={cinema_chain_id} onChange={(e) => setCinemaChainId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="">— None —</option>
              {chains.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <select value={region_id} onChange={(e) => setRegionId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option value="">— None —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save'}
          </button>
          <Link href="/theaters" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
