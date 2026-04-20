"use client";

import React from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BrandProvider } from "./brand-provider";

interface SessionUser {
  name: string;
  email: string;
  companyName: string | null;
  role: string;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <BrandProvider>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden lg:flex">
          <Sidebar />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10 flex">
              <Sidebar />
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-3 -right-11 p-2 bg-white rounded-lg shadow-md"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0">
          {/* Mobile hamburger strip */}
          <div className="lg:hidden flex items-center gap-2 px-4 h-12 border-b border-gray-200 bg-white shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 text-gray-700"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold">
              {user?.companyName || "C&D Reporting"}
            </span>
          </div>

          <Topbar
            companyName={user?.companyName || "C&D Printing Demo Account"}
            userName={user?.name || "User"}
            userEmail={user?.email}
          />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </BrandProvider>
  );
}
