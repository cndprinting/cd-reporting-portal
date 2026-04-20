"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Home,
  Mail,
  Phone,
  Globe,
  Share2,
  Target,
  Inbox,
  Video,
  QrCode,
  ShoppingCart,
  FileBarChart,
  Settings,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Palette,
  Shield,
  Building2,
} from "lucide-react";

const mainNav = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Dashboard", href: "/dashboard/overview", icon: LayoutDashboard },
  { label: "Designs", href: "/dashboard/designs", icon: Palette },
];

const channelNav = [
  { label: "Mail Tracking", href: "/dashboard/mail-tracking", icon: Mail },
  { label: "Call Tracking", href: "/dashboard/call-tracking", icon: Phone },
  { label: "Google Ads", href: "/dashboard/google-ads", icon: Globe },
  { label: "Facebook Ads", href: "/dashboard/facebook-ads", icon: Share2 },
  { label: "Behavioral Ads", href: "/dashboard/behavioral-ads", icon: Target },
  { label: "Gmail Ads", href: "/dashboard/gmail-ads", icon: Inbox },
  { label: "YouTube Ads", href: "/dashboard/youtube-ads", icon: Video },
  { label: "QR Codes", href: "/dashboard/qr-codes", icon: QrCode },
];

const bottomNav = [
  { label: "Orders", href: "/dashboard/orders", icon: ShoppingCart },
  { label: "Reports", href: "/dashboard/reports", icon: FileBarChart },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Mailers", href: "/dashboard/admin/mailers", icon: Building2 },
  { label: "Admin", href: "/dashboard/admin", icon: Shield },
];

const sampleCampaigns = [
  { id: "camp-1", name: "Spring Homeowner Mailer", code: "CD-2026-001" },
  { id: "camp-2", name: "South Florida Prospecting", code: "CD-2026-002" },
  { id: "camp-5", name: "Luxury Home Seller", code: "CD-2026-005" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [campaignsOpen, setCampaignsOpen] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-r border-gray-200 transition-all duration-200 h-full",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-brand-600 text-white font-bold text-sm shrink-0">
          C&D
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">cndprinting.com</p>
            <p className="text-xs text-gray-500 truncate">Reporting Portal</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {/* Main */}
        {mainNav.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} collapsed={collapsed} />
        ))}

        {/* Channels */}
        <div className="pt-3">
          {!collapsed && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Channels
            </p>
          )}
          {channelNav.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} collapsed={collapsed} />
          ))}
        </div>

        {/* Campaigns */}
        <div className="pt-3">
          {!collapsed && (
            <button
              onClick={() => setCampaignsOpen(!campaignsOpen)}
              className="flex items-center w-full px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
            >
              <Megaphone className="h-3 w-3 mr-1.5" />
              Campaigns
              {campaignsOpen ? (
                <ChevronDown className="h-3 w-3 ml-auto" />
              ) : (
                <ChevronRight className="h-3 w-3 ml-auto" />
              )}
            </button>
          )}
          {campaignsOpen &&
            !collapsed &&
            sampleCampaigns.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/campaigns/${c.id}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors",
                  pathname === `/dashboard/campaigns/${c.id}`
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{c.name}</span>
              </Link>
            ))}
          {!collapsed && (
            <Link
              href="/dashboard/campaigns"
              className="flex items-center px-3 py-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              View all campaigns
            </Link>
          )}
        </div>

        {/* Bottom */}
        <div className="pt-3 border-t border-gray-100 mt-3">
          {bottomNav.map((item) => (
            <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 rotate-90" />}
      </button>
    </aside>
  );
}

function NavItem({
  label,
  href,
  icon: Icon,
  active,
  collapsed,
}: {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-brand-50 text-brand-700 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-brand-600" : "text-gray-400")} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
