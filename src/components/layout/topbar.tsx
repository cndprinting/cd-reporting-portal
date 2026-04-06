"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Search,
  Bell,
  MapPin,
  Download,
  LayoutGrid,
  List,
  Settings,
  LogOut,
  User,
  Calendar,
  ChevronDown,
  Building2,
} from "lucide-react";

interface TopbarProps {
  companyName?: string;
  userName?: string;
  userEmail?: string;
}

export function Topbar({ companyName = "C&D Printing Demo Account", userName = "Sarah Johnson", userEmail }: TopbarProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [dateFilter, setDateFilter] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  return (
    <header className="flex items-center justify-between h-16 px-4 lg:px-6 bg-white border-b border-gray-200 shrink-0">
      {/* Left: Search + Company */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className={cn("relative", searchOpen ? "w-64" : "w-auto")}>
          {searchOpen ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns, reports..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
                onBlur={() => setSearchOpen(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Company selector */}
        <button className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{companyName}</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>

        <button className="hidden lg:flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
          <MapPin className="h-4 w-4" />
          <span className="text-xs">All Locations</span>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Date filter */}
        <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {[
            { value: "7d", label: "7D" },
            { value: "30d", label: "30D" },
            { value: "90d", label: "90D" },
            { value: "all", label: "All" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDateFilter(opt.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                dateFilter === opt.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {opt.label}
            </button>
          ))}
          <button className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 rounded-md">
            <Calendar className="h-3 w-3" />
            Custom
          </button>
        </div>

        {/* View toggle */}
        <div className="hidden lg:flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 transition-colors",
              viewMode === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 transition-colors",
              viewMode === "list" ? "bg-gray-100 text-gray-900" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Download */}
        <Button variant="outline" size="sm" className="hidden md:flex gap-1.5">
          <Download className="h-4 w-4" />
          Export
        </Button>

        {/* Settings */}
        <button className="flex items-center justify-center h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <Settings className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <button className="relative flex items-center justify-center h-9 w-9 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Avatar fallback={userName} size="sm" />
            <span className="hidden lg:block text-sm font-medium text-gray-700">{userName.split(" ")[0]}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-50 py-1">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userName}</p>
                  <p className="text-xs text-gray-500">{userEmail || "demo@cdprinting.com"}</p>
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
      </div>
    </header>
  );
}
