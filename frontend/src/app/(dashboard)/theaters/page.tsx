'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

type Theater = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  chain_name: string | null;
  region_name: string | null;
};

type ListResponse = { data: Theater[]; total: number };

export default function TheatersPage() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ListResponse>('/api/theaters')
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading theaters…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!list) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Theaters & locations</h1>
        <Link
          href="/theaters/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
        >
          Add theater
        </Link>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'chain_name', label: 'Chain' },
          { key: 'region_name', label: 'Region' },
          { key: 'city', label: 'City' },
          { key: 'country', label: 'Country' },
        ]}
        data={list.data}
        idKey="id"
        rowLink={(row) => `/theaters/${row.id}`}
      />
    </div>
  );
}
