"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useBrand } from "./brand-provider";
import {
  LayoutDashboard,
  Mail,
  Megaphone,
  Phone,
  FileBarChart,
  ChevronDown,
  ChevronRight,
  Shield,
  Palette,
  Package,
  Layers,
  CreditCard,
} from "lucide-react";

/**
 * Primary top-level nav — same 5 items for everyone.
 * Admin-only items live in a collapsible submenu at the bottom.
 */
const primaryNav: NavLink[] = [
  { label: "Dashboard", href: "/dashboard/overview", icon: LayoutDashboard },
  { label: "Orders", href: "/dashboard/orders", icon: Package },
  { label: "Packages", href: "/dashboard/packages", icon: Layers },
  { label: "Mail Tracking", href: "/dashboard/mail", icon: Mail },
  { label: "Reports", href: "/dashboard/reports", icon: FileBarChart },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

// Admin-only navigation. Items that were pure placeholder (Digital Ads,
// Engagement, Designs, Orders) removed until real integrations exist.
const adminNav: NavLink[] = [
  { label: "Orders", href: "/dashboard/admin/orders" },
  { label: "Packages", href: "/dashboard/admin/packages" },
  { label: "Customers", href: "/dashboard/admin/companies" },
  { label: "Campaigns", href: "/dashboard/admin/campaigns" },
  { label: "Templates", href: "/dashboard/admin/templates" },
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "API Keys", href: "/dashboard/admin/mailers" },
  { label: "Production Queue", href: "/dashboard/admin/production-queue" },
  { label: "Mail Import (manual)", href: "/dashboard/admin/mail-import" },
  { label: "Auto-Import (SharePoint)", href: "/dashboard/admin/auto-import" },
  { label: "USPS Feed Monitor", href: "/dashboard/admin/ingestion" },
  { label: "Unknown IMbs", href: "/dashboard/admin/unknown-imbs" },
  { label: "Scan Map", href: "/dashboard/admin/scan-map" },
  { label: "Demo Tools", href: "/dashboard/admin/demo-tools" },
  { label: "Scheduled Reports", href: "/dashboard/admin/reports" },
  { label: "Branding", href: "/dashboard/admin/branding" },
  { label: "Settings", href: "/dashboard/settings" },
];

interface NavLink {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function Sidebar() {
  const pathname = usePathname();
  const brand = useBrand();
  const [collapsed, setCollapsed] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(pathname.startsWith("/dashboard/admin"));
  const [role, setRole] = React.useState<string | null>(null);

  // Pull current user role to decide whether to show the admin section
  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setRole(d?.user?.role ?? null))
      .catch(() => {});
  }, []);

  const isAdmin = role === "ADMIN" || role === "ACCOUNT_MANAGER";

  const initials = brand.companyName
    .replace(/\./g, " ")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-r border-gray-200 transition-all duration-200 h-full",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200 shrink-0">
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={brand.companyName}
            className="h-9 w-9 rounded-lg object-contain bg-white shrink-0"
          />
        ) : (
          <div
            className="flex items-center justify-center h-9 w-9 rounded-lg text-white font-bold text-sm shrink-0"
            style={{
              backgroundColor: brand.isCustomerBranded
                ? brand.primary
                : "var(--brand-primary, #0284c7)",
            }}
          >
            {brand.isCustomerBranded ? initials : "C&D"}
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{brand.companyName}</p>
            <p className="text-xs text-gray-500 truncate">{brand.tagline}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {primaryNav.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={
              item.href === "/dashboard/overview"
                ? pathname === item.href || pathname === "/dashboard"
                : pathname.startsWith(item.href)
            }
            collapsed={collapsed}
          />
        ))}

        {/* Admin — collapsed submenu, ADMIN/ACCOUNT_MANAGER only */}
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className={cn(
                "flex items-center w-full gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                pathname.startsWith("/dashboard/admin")
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
              title={collapsed ? "Admin" : undefined}
            >
              <Shield
                className={cn(
                  "h-5 w-5 shrink-0",
                  pathname.startsWith("/dashboard/admin") ? "text-brand-600" : "text-gray-400",
                )}
              />
              {!collapsed && (
                <>
                  <span className="truncate flex-1 text-left">Admin</span>
                  {adminOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </button>
            {adminOpen && !collapsed && (
              <div className="ml-6 mt-1 space-y-0.5 border-l border-gray-100 pl-2">
                {adminNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block px-3 py-1.5 rounded-md text-xs transition-colors",
                      pathname === item.href
                        ? "bg-brand-50 text-brand-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customer account link (customers only) */}
        {!isAdmin && role && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <NavItem
              label="Account"
              href="/dashboard/settings"
              icon={Palette}
              active={pathname === "/dashboard/settings"}
              collapsed={collapsed}
            />
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4 rotate-90" />
        )}
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
  icon?: React.ComponentType<{ className?: string }>;
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
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      )}
      title={collapsed ? label : undefined}
    >
      {Icon && (
        <Icon
          className={cn("h-5 w-5 shrink-0", active ? "text-brand-600" : "text-gray-400")}
        />
      )}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
