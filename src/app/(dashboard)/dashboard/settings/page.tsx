"use client";

import React, { useState } from "react";
import { Settings, User, Bell, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [name, setName] = useState("Sarah Johnson");
  const [email, setEmail] = useState("demo@cdprinting.com");
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    campaignUpdates: true,
    weeklyDigest: false,
    leadAlerts: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your account preferences</p>
        </div>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            <CardTitle>Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <Input value="C&D Printing Demo Account" disabled className="bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <Input value="Admin" disabled className="bg-gray-50" />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-500" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "emailAlerts" as const, label: "Email Alerts", desc: "Receive email notifications for important updates" },
            { key: "campaignUpdates" as const, label: "Campaign Updates", desc: "Get notified when campaign status changes" },
            { key: "weeklyDigest" as const, label: "Weekly Digest", desc: "Receive a weekly summary of campaign performance" },
            { key: "leadAlerts" as const, label: "Lead Alerts", desc: "Instant notification when new leads come in" },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={notifications[item.key]}
                onChange={() => toggleNotification(item.key)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-500" />
            <CardTitle>Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <Input type="password" placeholder="Enter current password" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <Input type="password" placeholder="Enter new password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <Input type="password" placeholder="Confirm new password" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button className="bg-brand-600 hover:bg-brand-700 text-white px-8">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
