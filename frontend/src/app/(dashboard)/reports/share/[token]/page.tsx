'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type ShareData = {
  report: { id: string; title: string; type: string };
  summary: { id: string; name: string; show_count: string }[];
};

export default function ReportSharePage() {
  const params = useParams();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${base}/api/reports/share/${params.token}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Report not found'))
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) return <p className="p-8 text-gray-500">Loading…</p>;
  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2">{data.report.title}</h1>
      <p className="text-sm text-gray-500 mb-6">Read-only shared report</p>
      <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium">Project</th>
            <th className="px-4 py-2 text-left text-sm font-medium">Shows</th>
          </tr>
        </thead>
        <tbody>
          {data.summary.map((row) => (
            <tr key={row.id} className="border-t border-gray-100">
              <td className="px-4 py-2">{row.name}</td>
              <td className="px-4 py-2">{row.show_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
