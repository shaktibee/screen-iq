'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, organizationId, setOrganizationId, logout, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const orgs = user.organizations || [];
  const currentOrgId = organizationId || orgs[0]?.organization_id;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <Link href="/dashboard" className="font-semibold">ScreenIQ</Link>
        </div>
        <nav className="p-2 flex-1">
          <Link
            href="/dashboard"
            className="block px-3 py-2 rounded-lg mb-1 hover:bg-gray-800"
          >
            Home
          </Link>
        </nav>
        <div className="p-3 border-t border-gray-700">
          {orgs.length > 1 && (
            <select
              value={currentOrgId || ''}
              onChange={(e) => setOrganizationId(e.target.value || null)}
              className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1 mb-2"
            >
              {orgs.map((o) => (
                <option key={o.organization_id} value={o.organization_id}>
                  Org {o.organization_id.slice(0, 8)}…
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
          <button
            type="button"
            onClick={() => { logout(); router.push('/login'); }}
            className="mt-1 text-sm text-gray-400 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 bg-gray-50">{children}</main>
    </div>
  );
}
