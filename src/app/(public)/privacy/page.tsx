import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — MailerCity by C&D Printing",
  description:
    "How MailerCity by C&D Printing collects, uses, and protects information.",
};

const LAST_UPDATED = "May 14, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <header className="border-b border-line bg-paper">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo-icon.svg" alt="" className="h-9 w-9" />
            <div className="font-display text-lg font-medium">
              C&amp;D <span className="italic text-brand-600">MailerCity</span>
            </div>
          </Link>
          <Link
            href="/"
            className="text-sm text-stone hover:text-ink transition-colors"
          >
            ← Back to site
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-16 lg:py-20">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone mb-4">
          Last updated: {LAST_UPDATED}
        </div>
        <h1 className="font-display text-4xl lg:text-5xl font-medium leading-tight mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-stone max-w-none text-ink-soft leading-relaxed space-y-6">
          <p>
            C&amp;D Printing &amp; Packaging Co. (&ldquo;C&amp;D&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates MailerCity, a
            direct-mail platform at <code>marketing.cndprinting.com</code>{" "}
            (the &ldquo;Service&rdquo;). This Privacy Policy describes how we
            collect, use, and share information when you visit our website or
            use the Service.
          </p>

          <Section title="Information we collect">
            <p>
              We collect information you provide directly to us, including:
            </p>
            <ul>
              <li>
                <strong>Contact information</strong>: name, email address,
                company, and phone number, submitted via our quote-request
                form or account creation.
              </li>
              <li>
                <strong>Account credentials</strong>: email and a password
                hash if you create an account.
              </li>
              <li>
                <strong>Mailing data</strong>: recipient lists you upload to
                run a direct-mail campaign. This may include names, addresses,
                and merge fields you choose to include (e.g., property
                identifiers, account information). You are responsible for
                obtaining any necessary consents from the recipients on your
                lists.
              </li>
              <li>
                <strong>Payment information</strong>: processed by Stripe; we
                do not store full credit-card numbers on our servers.
              </li>
              <li>
                <strong>Usage data</strong>: pages visited, actions taken in
                the Service, and standard server-log information (IP address,
                browser type, referring page).
              </li>
              <li>
                <strong>Tracking technologies</strong>: cookies and pixels
                from us and our analytics/advertising partners (including
                Meta/Facebook) to measure site performance and ad
                effectiveness.
              </li>
            </ul>
          </Section>

          <Section title="How we use information">
            <ul>
              <li>To provide and operate the Service, including printing and mailing your campaigns.</li>
              <li>To communicate with you about your account, orders, and quotes.</li>
              <li>To process payments and prevent fraud.</li>
              <li>To improve and analyze the Service, and to develop new features.</li>
              <li>To advertise the Service to potential customers, including via re-targeting and lookalike audiences on advertising platforms.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </Section>

          <Section title="Information we share">
            <p>We share information with:</p>
            <ul>
              <li>
                <strong>Service providers</strong>: vendors who help us
                operate the Service, including our hosting provider (Vercel),
                database (Neon), email (Resend), payments (Stripe), and
                analytics/advertising (Meta/Facebook, Google Analytics where
                applicable).
              </li>
              <li>
                <strong>USPS</strong>: mailing addresses on your recipient
                lists are submitted to the United States Postal Service for
                automation discounts and delivery tracking.
              </li>
              <li>
                <strong>Authorities</strong>: where required by law or to
                respond to lawful requests.
              </li>
              <li>
                <strong>Business transfers</strong>: in connection with a
                merger, acquisition, or sale of assets.
              </li>
            </ul>
            <p>We do not sell your personal information.</p>
          </Section>

          <Section title="Your choices">
            <ul>
              <li>
                <strong>Access and correction</strong>: you can review or
                update your account information by signing in to the Service.
              </li>
              <li>
                <strong>Deletion</strong>: contact us at the address below to
                request deletion of your account and associated personal
                information. Some information may be retained as required for
                tax, compliance, or fraud-prevention purposes.
              </li>
              <li>
                <strong>Marketing emails</strong>: you can unsubscribe from
                marketing communications via the link in our emails. Service
                emails (e.g., order confirmations) will continue.
              </li>
              <li>
                <strong>Cookies</strong>: most browsers let you block or
                delete cookies. Doing so may degrade the Service.
              </li>
            </ul>
          </Section>

          <Section title="Data security">
            <p>
              We use industry-standard safeguards to protect information,
              including encryption in transit, encrypted storage for
              credentials, and access controls. No system is perfectly
              secure; we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="Children">
            <p>
              The Service is not directed to children under 13, and we do not
              knowingly collect personal information from children under 13.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this Privacy Policy. Material changes will be
              announced on this page with a revised &ldquo;Last updated&rdquo;
              date.
            </p>
          </Section>

          <Section title="Contact us">
            <p>
              Questions about this Privacy Policy or our data practices:
            </p>
            <p>
              <strong>C&amp;D Printing &amp; Packaging Co.</strong>
              <br />
              12150 28th St N
              <br />
              St. Petersburg, FL 33716
              <br />
              727-572-9999
            </p>
          </Section>
        </div>
      </article>

      <footer className="bg-ink text-paper">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-paper/50">
            © {new Date().getFullYear()}{" "}C&amp;D Printing &amp; Packaging Co.
          </div>
          <div className="flex items-center gap-4 text-paper/70">
            <Link href="/" className="hover:text-brand-300">Home</Link>
            <Link href="/privacy" className="hover:text-brand-300">Privacy</Link>
            <Link href="/terms" className="hover:text-brand-300">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-2">
      <h2 className="font-display text-2xl font-medium text-ink mt-8 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}
