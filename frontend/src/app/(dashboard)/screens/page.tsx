'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

type Screen = {
  id: string;
  name: string;
  capacity: number | null;
  theater_name: string | null;
};

type ListResponse = { data: Screen[]; total: number };

export default function ScreensPage() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ListResponse>('/api/screens')
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading screens…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!list) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Screens</h1>
        <Link
          href="/screens/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
        >
          Add screen
        </Link>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Screen' },
          { key: 'theater_name', label: 'Theater' },
          { key: 'capacity', label: 'Capacity' },
        ]}
        data={list.data}
        idKey="id"
        rowLink={(row) => `/screens/${row.id}`}
      />
    </div>
  );
}
