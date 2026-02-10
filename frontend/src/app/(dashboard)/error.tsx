'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="text-lg font-semibold text-red-900 mb-2">Something went wrong</h1>
        <p className="text-red-800 text-sm mb-4">{error.message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1.5 bg-red-700 text-white rounded-md hover:bg-red-800 text-sm"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 border border-red-300 rounded-md hover:bg-red-100 text-sm"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

