"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Shield, UserPlus, X, Copy, Check, Loader2, Link as LinkIcon,
} from "lucide-react";

const roleBadge: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  ACCOUNT_MANAGER: "bg-blue-100 text-blue-700",
  CUSTOMER: "bg-gray-100 text-gray-700",
};

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  ACCOUNT_MANAGER: "Manager",
  CUSTOMER: "Client",
};

const demoUsers = [
  { name: "Sarah Johnson", email: "admin@cndprinting.com", role: "ADMIN", company: "C&D Printing Demo Account", status: "Active" },
  { name: "Mike Chen", email: "manager@cndprinting.com", role: "ACCOUNT_MANAGER", company: "C&D Printing Demo Account", status: "Active" },
  { name: "John Rivera", email: "john@sunshinerealty.com", role: "CUSTOMER", company: "Sunshine Realty Group", status: "Active" },
  { name: "Lisa Martinez", email: "lisa@palmcoastins.com", role: "CUSTOMER", company: "Palm Coast Insurance", status: "Active" },
];

export default function AdminUsersPage() {
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("CUSTOMER");
  const [inviteUrl, setInviteUrl] = React.useState("");
  const [inviteLoading, setInviteLoading] = React.useState(false);
  const [inviteError, setInviteError] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteUrl("");

    if (!inviteEmail) {
      setInviteError("Email is required");
      return;
    }

    setInviteLoading(true);
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Failed to create invite");
        setInviteLoading(false);
        return;
      }

      setInviteUrl(data.inviteUrl);
      setInviteLoading(false);
    } catch {
      setInviteError("Something went wrong");
      setInviteLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setShowInviteModal(false);
    setInviteEmail("");
    setInviteRole("CUSTOMER");
    setInviteUrl("");
    setInviteError("");
    setCopied(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-brand-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">Manage users and send invites</p>
          </div>
        </div>
        <Button onClick={() => setShowInviteModal(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoUsers.map((user, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-gray-500">{user.email}</TableCell>
                <TableCell>
                  <Badge className={roleBadge[user.role]}>{roleLabel[user.role]}</Badge>
                </TableCell>
                <TableCell className="text-gray-500">{user.company}</TableCell>
                <TableCell>
                  <Badge variant="success">Active</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">View</Button>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Invite a User</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!inviteUrl ? (
                <form onSubmit={handleInvite} className="space-y-4">
                  {inviteError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                      {inviteError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="user@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <Select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      options={[
                        { value: "CUSTOMER", label: "Client (read-only access)" },
                        { value: "ACCOUNT_MANAGER", label: "Account Manager" },
                        { value: "ADMIN", label: "Admin (full access)" },
                      ]}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={inviteLoading}>
                    {inviteLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating invite...
                      </span>
                    ) : (
                      "Generate Invite Link"
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                    <LinkIcon className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-emerald-800">
                      Invite link created for {inviteEmail}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">Expires in 7 days</p>
                  </div>

                  <div className="flex gap-2">
                    <Input value={inviteUrl} readOnly className="text-xs bg-gray-50" />
                    <Button onClick={copyLink} variant="outline" className="shrink-0 gap-1.5">
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    Send this link to {inviteEmail}. They&apos;ll set their password and be logged in.
                  </p>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={closeModal}>
                      Done
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setInviteUrl("");
                        setInviteEmail("");
                      }}
                    >
                      Invite Another
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
