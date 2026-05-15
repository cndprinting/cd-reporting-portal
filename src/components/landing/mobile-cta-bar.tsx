"use client";

import { useEffect, useState } from "react";

/**
 * Sticky mobile-only CTA bar. Hides on desktop. Hides if the user is
 * within the #get-started section (no need to nudge them when they're
 * already at the form). Adds bottom padding to body so content isn't
 * hidden behind the bar.
 */
export function MobileCtaBar({ href = "#get-started" }: { href?: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const target = document.getElementById("get-started");
    if (!target) return;
    const obs = new IntersectionObserver(
      (entries) => setHidden(entries[0]?.isIntersecting ?? false),
      { rootMargin: "-30% 0px -30% 0px" },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, []);

  if (hidden) return null;

  return (
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/95 backdrop-blur border-t border-line p-3 shadow-lg">
      <a
        href={href}
        className="flex items-center justify-center w-full h-12 rounded bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
      >
        Request a quote →
      </a>
    </div>
  );
}
