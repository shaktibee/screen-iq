'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DataTable } from '@/components/DataTable';

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role_name: string;
  created_at: string;
};

export default function UsersPage() {
  const [list, setList] = useState<{ data: UserRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Analyst' | 'Viewer'>('Viewer');
  const [inviteLoading, setInviteLoading] = useState(false);

  const load = () => api<{ data: UserRow[] }>('/api/users').then(setList).catch((e) => setError(e.message));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    try {
      await api('/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          password: invitePassword,
          role: inviteRole,
        }),
      });
      setInviteOpen(false);
      setInviteEmail('');
      setInvitePassword('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invite failed');
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading) return <p className="text-gray-500">Loading users…</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!list) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">User management</h1>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          Invite user
        </button>
      </div>
      <DataTable
        columns={[
          { key: 'email', label: 'Email' },
          { key: 'full_name', label: 'Name' },
          { key: 'role_name', label: 'Role' },
          { key: 'created_at', label: 'Joined' },
        ]}
        data={list.data}
        idKey="id"
      />
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="font-semibold mb-4">Invite user</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary password (min 8)</label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'Admin' | 'Analyst' | 'Viewer')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Analyst">Analyst</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {inviteLoading ? 'Sending…' : 'Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
