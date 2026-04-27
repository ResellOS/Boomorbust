import { createAdminClient } from '@/lib/supabase/admin';
import AdminActions from './AdminActions';

interface StatCard {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}

function StatCard({ label, value, sub, accent }: StatCard) {
  return (
    <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-5">
      <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-[#475569] text-xs mt-1">{sub}</p>}
    </div>
  );
}

function timeAgo(ts: string): string {
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default async function AdminPage() {
  const db = createAdminClient();

  const [
    { count: totalUsers },
    { count: paidUsers },
    { count: totalLeagues },
    { data: recentUsers },
    { data: errorLogs },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_paid', true),
    db.from('leagues').select('*', { count: 'exact', head: true }),
    db.from('profiles')
      .select('id, username, is_paid, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10),
    db.from('error_logs')
      .select('id, source, message, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const freeUsers = (totalUsers ?? 0) - (paidUsers ?? 0);
  const avgLeagues = totalUsers ? ((totalLeagues ?? 0) / totalUsers).toFixed(1) : '—';

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
        <p className="text-sm text-[#94A3B8]">The Front Office — internal overview</p>
      </div>

      {/* User stats */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-4">Users</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={totalUsers ?? 0} />
          <StatCard label="Paid" value={paidUsers ?? 0} accent="text-green-400" />
          <StatCard label="Free" value={freeUsers} />
          <StatCard
            label="Conversion"
            value={totalUsers ? `${Math.round(((paidUsers ?? 0) / totalUsers) * 100)}%` : '—'}
            accent="text-[#6366F1]"
          />
        </div>
      </section>

      {/* League stats */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-4">Leagues</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Leagues Synced" value={totalLeagues ?? 0} />
          <StatCard label="Avg Leagues / User" value={avgLeagues} />
        </div>
      </section>

      {/* Recent signups */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-4">Recent Users</h2>
        <div className="bg-[#1E293B] rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-[#475569] uppercase tracking-wider">
                <th className="text-left px-5 py-3">Username</th>
                <th className="text-left px-5 py-3">Plan</th>
                <th className="text-left px-5 py-3">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {(recentUsers ?? []).map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="px-5 py-3 text-[#CBD5E1]">{u.username ?? <span className="text-[#475569]">—</span>}</td>
                  <td className="px-5 py-3">
                    {u.is_paid
                      ? <span className="text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Pro</span>
                      : <span className="text-xs text-[#475569]">Free</span>}
                  </td>
                  <td className="px-5 py-3 text-[#475569] text-xs">{timeAgo(u.updated_at)}</td>
                </tr>
              ))}
              {!recentUsers?.length && (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-[#475569] text-sm">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Error logs */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-4">Error Logs</h2>
        <div className="bg-[#1E293B] rounded-2xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-[#475569] uppercase tracking-wider">
                <th className="text-left px-5 py-3 w-32">Source</th>
                <th className="text-left px-5 py-3">Message</th>
                <th className="text-left px-5 py-3 w-28">Time</th>
              </tr>
            </thead>
            <tbody>
              {(errorLogs ?? []).map((e) => (
                <tr key={e.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 text-[#6366F1] text-xs font-mono">{e.source}</td>
                  <td className="px-5 py-3 text-[#94A3B8] text-xs font-mono truncate max-w-sm">{e.message}</td>
                  <td className="px-5 py-3 text-[#475569] text-xs">{timeAgo(e.created_at)}</td>
                </tr>
              ))}
              {!errorLogs?.length && (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-[#475569] text-sm">No errors logged</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-4">Quick Actions</h2>
        <AdminActions />
      </section>
    </div>
  );
}
