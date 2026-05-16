export default function DashboardLoading() {
  return (
    <div className="min-h-screen pt-16 pb-20" style={{ background: '#0a0d14' }}>
      {/* Stats bar skeleton */}
      <div className="border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-7xl flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[80px] h-14 rounded-lg animate-pulse bg-white/[0.06]" />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Player hub skeletons */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl animate-pulse bg-white/[0.05]" />
          ))}
        </div>

        {/* Panel skeletons */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 h-72 rounded-xl animate-pulse bg-white/[0.05]" />
          <div className="h-72 rounded-xl animate-pulse bg-white/[0.05]" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="h-56 rounded-xl animate-pulse bg-white/[0.05]" />
          <div className="h-56 rounded-xl animate-pulse bg-white/[0.05]" />
        </div>
      </div>
    </div>
  );
}
