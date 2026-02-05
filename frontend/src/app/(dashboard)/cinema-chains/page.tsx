'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

type Chain = {
  id: string;
  name: string;
  created_at: string;
};

type ListResponse = { data: Chain[]; total: number };

export default function CinemaChainsPage() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ListResponse>('/api/cinema-chains')
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading cinema chains…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!list) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Cinema chains</h1>
        <Link
          href="/cinema-chains/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
        >
          Add chain
        </Link>
      </div>
      <DataTable
        columns={[{ key: 'name', label: 'Name' }]}
        data={list.data}
        idKey="id"
      />
    </div>
  );
}
