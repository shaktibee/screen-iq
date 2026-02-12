'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, organizationId, setOrganizationId, logout, isReady } = useAuth();

  if (!isReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-100"
        style={{ minHeight: '100vh' }}
      >
        <p className="text-gray-700 text-lg">Loading…</p>
      </div>
    );
  }

  if (!user) {
    router.replace('/login');
    return null;
  }

  const orgs = user.organizations || [];
  const currentOrgId = organizationId || orgs[0]?.organization_id;
  const pathname = usePathname();

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        'block px-3 py-2 rounded-lg mb-1',
        pathname === href ? 'bg-[#2d4a6f]' : 'hover:bg-[#2d4a6f]'
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex">
      {/* Fixed sidebar - does not move when content or route changes */}
      <aside className="fixed inset-y-0 left-0 z-30 w-56 shrink-0 bg-[#1e3a5f] text-white flex flex-col">
        <div className="p-4 border-b border-[#2d4a6f] flex items-center gap-2">
          <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#1e3a5f] font-bold">C</span>
          <Link href="/dashboard" className="font-semibold">ScreenIQ</Link>
        </div>
        <nav className="p-2 flex-1 overflow-y-auto">
          {navLink('/dashboard', 'Home')}
          {navLink('/movies', 'Movies')}
          {navLink('/programme/overview', 'Schedule overview')}
          {navLink('/programme/new', 'Create programme')}
          {navLink('/programming-dashboard', 'Programming Team')}
          {navLink('/movie-parameters', 'Movie Parameters')}
          {navLink('/cinema-dashboard', 'Cinema Dashboard')}
          {navLink('/report', 'Reports')}
          {navLink('/settings', 'Settings')}
        </nav>
        <div className="p-3 border-t border-[#2d4a6f] shrink-0">
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
      {/* Main content offset by sidebar width */}
      <div className="flex-1 flex flex-col min-h-screen pl-56">
        <header className="h-14 shrink-0 bg-[#1e3a5f] border-b border-[#2d4a6f] flex items-center justify-end px-6">
          <button type="button" className="w-9 h-9 rounded-full bg-[#2d4a6f] flex items-center justify-center text-white text-sm font-medium ring-2 ring-white/20">
            U
          </button>
        </header>
        <main className="flex-1 min-w-0 overflow-auto p-6 bg-gray-100 relative flex flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#1e3a5f08_0%,transparent_50%)] pointer-events-none" />
          <div className="relative flex-1 min-w-0 w-full overflow-x-hidden flex flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
