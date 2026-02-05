'use client';

export type MoviesByLocationsRow = {
  project_id: string;
  movie: string;
  locations: Record<string, number>;
};

export type MoviesByLocationsData = {
  weekStart: string;
  weekEnd: string;
  columns: string[];
  rows: MoviesByLocationsRow[];
};

export function MoviesByLocationsTable({ data }: { data: MoviesByLocationsData | null }) {
  if (!data || data.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-medium text-gray-900 mb-3">Movies × Locations</h2>
        <p className="text-sm text-gray-500">No data for this period. Add shows to see allocation by location.</p>
      </div>
    );
  }

  const { columns, rows } = data;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <h2 className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">Movies × Locations</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                Movie
              </th>
              {columns.map((col) => (
                <th key={col} className="text-right px-4 py-2 font-medium text-gray-600 min-w-[80px]">
                  {col}
                </th>
              ))}
              <th className="text-right px-4 py-2 font-medium text-gray-600 bg-gray-100">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const total = columns.reduce((sum, col) => sum + (row.locations[col] ?? 0), 0);
              return (
                <tr
                  key={row.project_id}
                  className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}
                >
                  <td className="px-4 py-2 font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                    {row.movie}
                  </td>
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-2 text-right">
                      {row.locations[col] ?? 0}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-medium bg-gray-50/80">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
