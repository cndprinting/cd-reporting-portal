"use client";

/**
 * Direct Mail landing — routes to admin or customer view depending on session role.
 * Replaces the old separate /mail-tracking and /my-tracking tabs.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DirectMailPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        const role = d?.user?.role;
        if (role === "ADMIN" || role === "ACCOUNT_MANAGER") {
          router.replace("/dashboard/mail-tracking");
        } else {
          router.replace("/dashboard/my-tracking");
        }
      })
      .catch(() => router.replace("/dashboard/my-tracking"));
  }, [router]);

  return (
    <div className="flex items-center justify-center h-96 text-gray-500">
      Loading Direct Mail view…
    </div>
  );
}
