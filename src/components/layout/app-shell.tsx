"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface SessionUser {
  name: string;
  email: string;
  companyName: string | null;
  role: string;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          companyName={user?.companyName || "C&D Printing Demo Account"}
          userName={user?.name || "User"}
          userEmail={user?.email}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
