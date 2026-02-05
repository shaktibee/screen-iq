'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

type Project = {
  id: string;
  name: string;
  release_date: string | null;
  language: string | null;
  regions: string[] | null;
  created_at: string;
};

type ListResponse = { data: Project[]; total: number };

export default function ProjectsPage() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ListResponse>('/api/projects')
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading projects…</p>;
  if (error) {
    const isNoOrg = error.toLowerCase().includes('no organization assigned');
    const isServerError = error.toLowerCase().includes('internal') || error.toLowerCase().includes('failed');
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <p className="font-medium">{error}</p>
        {isNoOrg && (
          <p className="mt-2 text-sm">
            Log out and sign up again so an organization is created for your account. If you already signed up, ensure the database is running and migrations were applied (<code className="bg-red-100 px-1">npm run db:migrate</code> in backend).
          </p>
        )}
        {isServerError && !isNoOrg && (
          <p className="mt-2 text-sm">
            Check that the backend is running (port 4000) and PostgreSQL is up with migrations applied.
          </p>
        )}
      </div>
    );
  }
  if (!list) return null;

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'release_date', label: 'Release date' },
    { key: 'language', label: 'Language' },
    { key: 'regions', label: 'Regions' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Movies</h1>
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
        >
          New movie
        </Link>
      </div>
      <DataTable
        columns={columns}
        data={list.data}
        idKey="id"
        rowLink={(row) => `/projects/${row.id}`}
      />
    </div>
  );
}
