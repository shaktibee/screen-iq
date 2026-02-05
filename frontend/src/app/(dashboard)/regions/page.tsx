'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

type Region = {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
};

type ListResponse = { data: Region[]; total: number };

export default function RegionsPage() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ListResponse>('/api/regions')
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading regions…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!list) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Regions</h1>
        <Link
          href="/regions/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
        >
          Add region
        </Link>
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'code', label: 'Code' },
        ]}
        data={list.data}
        idKey="id"
      />
    </div>
  );
}
