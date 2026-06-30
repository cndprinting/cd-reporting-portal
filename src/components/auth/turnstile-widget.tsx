"use client";

/**
 * Cloudflare Turnstile widget.
 * Conditionally renders if NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; otherwise
 * fires onToken("") so the parent form works without CAPTCHA in dev.
 */

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile script load failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      // No CAPTCHA configured — let the parent submit without a token.
      onToken("");
      return;
    }
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          "error-callback": () => onToken(""),
          "expired-callback": () => onToken(""),
          theme: "light",
        });
      })
      .catch(() => {
        // Script blocked or offline — fail open at the API layer.
        onToken("");
      });
    return () => {
      cancelled = true;
      try {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      } catch {
        /* ignore */
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!siteKey) return null;
  return <div ref={containerRef} className="my-2" />;
}
