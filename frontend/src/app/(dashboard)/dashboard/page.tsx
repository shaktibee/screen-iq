'use client';

import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#1e3a5f]">Welcome</h1>
        <p className="text-sm text-muted-foreground">
          You are logged in. Use the options below to manage schedules and view dashboards.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/programme/new"
          className="flex flex-col rounded-xl border border-[#1e3a5f]/20 bg-white p-6 shadow-sm transition hover:border-[#1e3a5f]/40 hover:shadow-md"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#1e3a5f]/10 text-[#1e3a5f]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <h2 className="font-semibold text-[#1e3a5f]">Create new programme</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule a movie across locations and theatres with show allocation, version, and TAT settings.
          </p>
        </Link>

        <Link
          href="/programming-dashboard"
          className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </div>
          <h2 className="font-semibold text-gray-900">Programming Team</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rebalancing requirements, approvals, and city-wise breakdown.
          </p>
        </Link>

        <Link
          href="/cinema-dashboard"
          className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
          </div>
          <h2 className="font-semibold text-gray-900">Cinema Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Location schedule, replacements, and make changes.
          </p>
        </Link>

        <Link
          href="/report"
          className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-300 hover:shadow-md"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          </div>
          <h2 className="font-semibold text-gray-900">Report</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            KPIs, rebalancing effectiveness, and revenue outcomes.
          </p>
        </Link>
      </div>
    </div>
  );
}
