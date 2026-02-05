'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

type Report = {
  id: string;
  title: string;
  type: string;
  share_token: string | null;
  created_at: string;
};

export default function ReportsPage() {
  const [list, setList] = useState<{ data: Report[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = () => api<{ data: Report[] }>('/api/reports').then(setList).catch((e) => setError(e.message));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const createReport = async () => {
    setCreating(true);
    try {
      await api('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ title: `Report ${new Date().toISOString().slice(0, 10)}`, type: 'summary' }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const handleExport = async (id: string, format: 'pdf' | 'xlsx', title: string) => {
    try {
      const { apiBlob } = await import('@/lib/api');
      const blob = await apiBlob(`/api/reports/${id}/export?format=${format}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  if (loading) return <p className="text-gray-500">Loading reports…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!list) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <button
          type="button"
          onClick={createReport}
          disabled={creating}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'New report'}
        </button>
      </div>
      <DataTable
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'type', label: 'Type' },
          { key: 'created_at', label: 'Created' },
        ]}
        data={list.data}
        idKey="id"
      />
      <div className="mt-4 space-y-2">
        {list.data.map((r) => (
          <div key={r.id} className="flex items-center gap-3 text-sm">
            <span className="font-medium">{r.title}</span>
            <button
              type="button"
              onClick={() => handleExport(r.id, 'pdf', r.title)}
              className="text-gray-600 hover:underline"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport(r.id, 'xlsx', r.title)}
              className="text-gray-600 hover:underline"
            >
              Export Excel
            </button>
            {r.share_token && (
              <Link href={`/reports/share/${r.share_token}`} className="text-gray-600 hover:underline">
                Share link
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
