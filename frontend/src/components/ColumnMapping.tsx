'use client';

import { useState } from 'react';

type ColumnMappingProps = {
  preview: Record<string, unknown>[];
  columns: string[];
  uploadId: string;
  totalRows: number;
  onSubmit: (columnMapping: Record<string, string>, requiredFields: string[]) => void;
  loading?: boolean;
};

const SUGGESTED_FIELDS = ['name', 'date', 'region', 'screen', 'capacity', 'start_time', 'end_time'];

export function ColumnMapping({
  preview,
  columns,
  totalRows,
  onSubmit,
  loading,
}: ColumnMappingProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(
    () => Object.fromEntries(columns.map((c) => [c, '']))
  );
  const [required, setRequired] = useState<string[]>([]);

  const handleMap = (col: string, field: string) => {
    setMapping((m) => ({ ...m, [col]: field }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const columnMapping = Object.fromEntries(
      Object.entries(mapping).filter(([, v]) => v.trim())
    ) as Record<string, string>;
    if (Object.keys(columnMapping).length === 0) return;
    const requiredFields = required.filter((f) => Object.values(columnMapping).includes(f));
    onSubmit(columnMapping, requiredFields);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-gray-600">{totalRows} rows • Map columns to field names</p>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium">
                  <div className="font-mono text-gray-700">{col}</div>
                  <select
                    value={mapping[col] || ''}
                    onChange={(e) => handleMap(col, e.target.value)}
                    className="mt-1 w-full border border-gray-300 rounded text-gray-900"
                  >
                    <option value="">— Skip —</option>
                    {SUGGESTED_FIELDS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <label className="mt-1 flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={required.includes(mapping[col] || '')}
                      onChange={(e) => {
                        const f = mapping[col];
                        if (!f) return;
                        setRequired((r) =>
                          e.target.checked ? [...r, f] : r.filter((x) => x !== f)
                        );
                      }}
                    />
                    Required
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.slice(0, 5).map((row, i) => (
              <tr key={i} className="border-t border-gray-100">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-gray-600">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save and import'}
      </button>
    </form>
  );
}
