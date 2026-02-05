'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

type Show = {
  id: string;
  name: string;
  screen_name: string | null;
  screen_name_resolved: string | null;
  theater_name: string | null;
  region: string | null;
  start_time: string;
  end_time: string;
  capacity: number | null;
  ticket_price: number | null;
  sold_count: number | null;
};

type ListResponse = { data: Show[]; total: number };

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatMoney(n: number | null) {
  if (n == null) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n);
}

export default function ProjectShowsPage() {
  const params = useParams();
  const projectId = String(params.id);
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ListResponse>(`/api/shows?projectId=${projectId}`)
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <p className="text-gray-500">Loading shows…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!list) return null;

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'screen_name_resolved', label: 'Screen' },
    { key: 'theater_name', label: 'Theater' },
    { key: 'region', label: 'Region' },
    { key: 'start_time', label: 'Start time' },
    { key: 'end_time', label: 'End time' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'ticket_price', label: 'Ticket price' },
    { key: 'sold_count', label: 'Sold (occupancy)' },
  ];

  const rows = list.data.map((row) => ({
    ...row,
    start_time: formatTime(row.start_time),
    end_time: formatTime(row.end_time),
    ticket_price: row.ticket_price != null ? formatMoney(row.ticket_price) : '—',
    sold_count: row.sold_count != null ? `${row.sold_count}${row.capacity != null ? ` / ${row.capacity}` : ''}` : '—',
  }));

  return (
    <div>
      <Link href={`/projects/${projectId}`} className="text-gray-600 hover:text-gray-900 mb-4 inline-block">← Movie</Link>
      <h1 className="text-2xl font-semibold mb-6">Show times</h1>
      <DataTable
        columns={columns}
        data={rows}
        idKey="id"
      />
    </div>
  );
}
