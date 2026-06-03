import Link from "next/link";

export const metadata = {
  title: "Terms of Service — MailerCity by C&D Printing",
  description: "Terms governing the use of MailerCity by C&D Printing.",
};

const LAST_UPDATED = "May 14, 2026";

export default function TermsPage() {
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
          Terms of Service
        </h1>

        <div className="text-ink-soft leading-relaxed space-y-6">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of
            MailerCity, a direct-mail platform provided by C&amp;D Printing
            &amp; Packaging Co. (&ldquo;C&amp;D&rdquo;, &ldquo;we&rdquo;,
            &ldquo;us&rdquo;). By using the Service, you agree to these
            Terms.
          </p>

          <Section title="The Service">
            <p>
              MailerCity lets you place orders for printed direct-mail
              campaigns, upload recipient lists, and view USPS scan tracking
              for mailpieces produced by C&amp;D. Print production occurs at
              C&amp;D&apos;s facility in St. Petersburg, Florida.
            </p>
          </Section>

          <Section title="Accounts">
            <p>
              You must provide accurate information when creating an account.
              You are responsible for safeguarding your password and for all
              activity under your account. Notify us promptly of any
              unauthorized use.
            </p>
          </Section>

          <Section title="Your content + recipient lists">
            <p>You represent and warrant that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You own or have the right to use any artwork, copy, logos, or
                other content you upload (&ldquo;Customer Content&rdquo;).
              </li>
              <li>
                You have a lawful basis to mail every recipient on every list
                you upload (the &ldquo;List(s)&rdquo;), including compliance
                with applicable consumer-protection, do-not-mail, and
                anti-spam laws.
              </li>
              <li>
                Your Customer Content and Lists do not infringe third-party
                rights, violate law, or contain unlawful, deceptive,
                obscene, or hateful material.
              </li>
            </ul>
            <p className="mt-4">
              You grant C&amp;D a non-exclusive license to use Customer
              Content and Lists solely to provide the Service (print, mail,
              and report on your campaigns). You retain ownership of your
              Customer Content and Lists.
            </p>
          </Section>

          <Section title="Pricing, payment, and refunds">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Pricing is shown on the rate card and confirmed at order
                creation. Standard Class postage is added separately at USPS
                rates.
              </li>
              <li>
                Final mailable quantity is reconciled after AccuZIP CASS/NCOA
                cleansing — you pay only for pieces that drop.
              </li>
              <li>
                Payment is processed by Stripe. By providing payment
                information, you authorize us to charge the agreed amount.
              </li>
              <li>
                Once a job is in production, refunds are limited to
                non-printed pieces (e.g., quantity reductions after
                cleansing).
              </li>
            </ul>
          </Section>

          <Section title="USPS tracking">
            <p>
              Scan tracking depends on USPS&apos;s Informed Visibility (IV-MTR)
              service. USPS scan coverage varies by mail class, region, and
              facility. Standard Class letters typically receive scan
              coverage on 50–90% of pieces. C&amp;D does not guarantee 100%
              piece-level delivery scans.
            </p>
          </Section>

          <Section title="Production timing">
            <p>
              Standard production turn is approximately 7 business days after
              proof and payment approval. Drop dates are coordinated with
              USPS induction windows. Delays caused by USPS or third parties
              are outside C&amp;D&apos;s control.
            </p>
          </Section>

          <Section title="Prohibited use">
            <p>You agree not to use the Service to mail:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Material that violates law or third-party rights.</li>
              <li>Fraudulent solicitations or deceptive offers.</li>
              <li>Adult material to minors, or any material illegal to mail under USPS regulations.</li>
              <li>Lists obtained without proper consent or legal basis.</li>
            </ul>
            <p className="mt-4">
              C&amp;D may refuse, suspend, or terminate any order or account
              we determine, in our sole discretion, violates these Terms.
            </p>
          </Section>

          <Section title="Confidentiality">
            <p>
              We hold your Customer Content and Lists in confidence and use
              them only to provide the Service, except as required by law or
              described in our Privacy Policy.
            </p>
          </Section>

          <Section title="Warranties + disclaimers">
            <p className="uppercase text-sm">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as
              available&rdquo;. To the maximum extent permitted by law,
              C&amp;D disclaims all warranties, express or implied,
              including merchantability, fitness for a particular purpose,
              and non-infringement.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p className="uppercase text-sm">
              To the maximum extent permitted by law, C&amp;D&apos;s
              aggregate liability arising out of or related to the Service
              will not exceed the amount you paid C&amp;D in the twelve (12)
              months preceding the claim. C&amp;D is not liable for
              indirect, incidental, consequential, or punitive damages.
            </p>
          </Section>

          <Section title="Indemnification">
            <p>
              You agree to indemnify C&amp;D against any claim arising from
              your Customer Content, your Lists, your use of the Service in
              violation of these Terms, or your violation of law.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              You may close your account at any time. We may suspend or
              terminate your access if you breach these Terms. Sections that
              by their nature should survive (e.g., payment obligations,
              warranty disclaimers, indemnification) will survive termination.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              We may update these Terms. Material changes will be announced
              on this page with a revised &ldquo;Last updated&rdquo; date.
              Continued use after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These Terms are governed by the laws of the State of Florida,
              without regard to conflict-of-laws principles. Any dispute will
              be brought in state or federal courts located in Pinellas
              County, Florida.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              <strong>C&amp;D Printing &amp; Packaging Co.</strong>
              <br />
              12150 28th St N
              <br />
              St. Petersburg, FL 33716
              <br />
              <a href="tel:+17275729999" className="phone-link">727-572-9999</a>
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
    <section>
      <h2 className="font-display text-2xl font-medium text-ink mt-8 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}
