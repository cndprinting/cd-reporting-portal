"use client";

import React, { useEffect, useState } from "react";
import { Settings as SettingsIcon, User, LogOut, HelpCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  companyName?: string | null;
}

export default function SettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d?.user ?? null))
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    window.location.href = "/login";
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <SettingsIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">
            Your account details and sign-out
          </p>
        </div>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            <CardTitle>Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs text-gray-500 mb-1">Name</div>
              <div className="font-medium text-gray-900">{user.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Email</div>
              <div className="font-medium text-gray-900">{user.email}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Company</div>
              <div className="font-medium text-gray-900">
                {user.companyName ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Role</div>
              <div className="font-medium text-gray-900">
                {user.role.replace(/_/g, " ")}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            To change your name, email, or password, contact your C&amp;D account
            manager.
          </p>
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gray-500" />
            <CardTitle>Support</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Questions about your campaigns or tracking data? Email{" "}
            <a
              href="mailto:support@cndprinting.com"
              className="text-brand-600 hover:underline font-medium"
            >
              support@cndprinting.com
            </a>{" "}
            or contact your account manager.
          </p>
        </CardContent>
      </Card>

      {/* Sign out */}
      <div>
        <Button
          variant="outline"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
