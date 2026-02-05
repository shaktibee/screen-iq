'use client';

import Link from 'next/link';

type Column<T> = { key: keyof T | string; label: string };

type DataTableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  data: T[];
  idKey: keyof T;
  rowLink?: (row: T) => string;
  sortable?: boolean;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  idKey,
  rowLink,
}: DataTableProps<T>) {
  const getVal = (row: T, key: keyof T | string) => {
    const v = row[key as keyof T];
    if (Array.isArray(v)) return v.join(', ');
    if (v != null && typeof v === 'object' && 'toISOString' in v) return (v as unknown as Date).toISOString().slice(0, 10);
    return String(v ?? '');
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-4 py-2 text-sm font-medium text-gray-700">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const id = String(row[idKey]);
            const link = rowLink?.(row);
            return (
              <tr key={id} className="hover:bg-gray-50">
                {columns.map((col, i) => (
                  <td key={String(col.key)} className="px-4 py-2 text-sm border-b border-gray-100">
                    {link && i === 0 ? (
                      <Link href={link} className="text-gray-900 hover:underline">
                        {getVal(row, col.key)}
                      </Link>
                    ) : (
                      getVal(row, col.key)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {data.length === 0 && (
        <p className="px-4 py-8 text-center text-gray-500 text-sm">No rows</p>
      )}
    </div>
  );
}
