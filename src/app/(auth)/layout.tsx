export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-display font-medium tracking-tight text-white">
          C&amp;D <span className="text-brand-200 italic">MailerCity</span>
        </h1>
        <p className="text-brand-200 text-sm mt-2">
          We run your mail marketing &middot; Campaign Performance Dashboard
        </p>
      </div>
      {children}
      <p className="mt-8 text-xs text-brand-300">
        Powered by{" "}
        <span className="font-medium text-brand-200">cndprinting.com</span>
      </p>
    </div>
  );
}
