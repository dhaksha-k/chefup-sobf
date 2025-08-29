export default function Shell({
  title, subtitle, children, step, total
}: { title: string; subtitle?: string; children: React.ReactNode; step?: number; total?: number }) {
  return (
    <div className="min-h-screen app-bg grid place-items-center px-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-3xl shadow-card border border-gray-100 p-5 sm:p-6">
        <header className="mb-4">
          <div className="text-center text-sm text-brand-sky font-medium">ChefUp by FarmdOut</div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 text-center">{title}</h1>
          {subtitle && <p className="text-gray-600 text-center mt-1">{subtitle}</p>}
          {typeof step === 'number' && typeof total === 'number' && (
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-sky to-brand-blue rounded-full"
                style={{ width: `${(step / total) * 100}%` }}
              />
            </div>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}
