"use client";

/**
 * Simplified topbar — only shows elements that actually work.
 * Removed (were decorative-only, confusing for users):
 *   search, company selector, locations, date range, view toggle,
 *   export, settings icon, notifications bell
 * Keep: company name label + profile menu.
 */

import React from "react";
import { Avatar } from "@/components/ui/avatar";
import { ChevronDown, LogOut, User, Settings } from "lucide-react";

interface TopbarProps {
  companyName?: string;
  userName?: string;
  userEmail?: string;
}

export function Topbar({
  companyName = "C&D Printing",
  userName = "User",
  userEmail,
}: TopbarProps) {
  const [profileOpen, setProfileOpen] = React.useState(false);

  return (
    <header className="flex items-center justify-between h-14 px-4 lg:px-6 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="hidden md:block text-sm font-medium text-gray-700 truncate">
          {companyName}
        </span>
      </div>

      <div className="relative">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Avatar fallback={userName} size="sm" />
          <span className="hidden lg:block text-sm font-medium text-gray-700">
            {userName.split(" ")[0]}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>

        {profileOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-50 py-1">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{userEmail || ""}</p>
              </div>
              <a
                href="/dashboard/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="h-4 w-4 text-gray-400" />
                Profile
              </a>
              <a
                href="/dashboard/settings"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4 text-gray-400" />
                Settings
              </a>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={async () => {
                    await fetch("/api/auth", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "logout" }),
                    });
                    window.location.href = "/login";
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
