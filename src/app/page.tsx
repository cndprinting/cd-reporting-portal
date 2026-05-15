/**
 * MailerCity public landing page.
 *
 * Logged-in users → redirect to /dashboard/overview.
 * Logged-out users → see this marketing page. Footer "Sign In" leads to /login.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LandingPage } from "@/components/landing/landing-page";
import { ALL_TIERS, POSTAGE_PER_UNIT, EFFECTIVE_DATE } from "@/lib/services/rate-card";

export const metadata = {
  title: "MailerCity by C&D Printing — Direct mail, printed and tracked.",
  description:
    "Variable-data direct mail with USPS scan-level delivery tracking. Built by C&D Printing — Printing Excellence since 1973.",
};

export default async function PublicHomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard/overview");

  return (
    <LandingPage
      rateCard={{
        postcards: ALL_TIERS.postcards,
        letters: ALL_TIERS.letters,
        postage: POSTAGE_PER_UNIT,
        effective: EFFECTIVE_DATE,
      }}
    />
  );
}
