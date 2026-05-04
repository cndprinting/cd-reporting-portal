export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-4 py-12">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center bg-white rounded-2xl px-6 py-4 mb-3 shadow-lg">
          <img
            src="/logo-mailercity.png"
            alt="C&D MailerCity — We run your mail marketing"
            className="h-14 w-auto"
          />
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
