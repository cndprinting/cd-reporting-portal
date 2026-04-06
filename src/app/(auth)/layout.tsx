export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-4 py-12">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm text-white font-bold text-lg">
            C&D
          </div>
          <h1 className="text-2xl font-bold text-white">C&D Reporting Portal</h1>
        </div>
        <p className="text-brand-200 text-sm">Campaign Performance Dashboard</p>
      </div>
      {children}
      <p className="mt-8 text-xs text-brand-300">
        Powered by{" "}
        <span className="font-medium text-brand-200">cndprinting.com</span>
      </p>
    </div>
  );
}
