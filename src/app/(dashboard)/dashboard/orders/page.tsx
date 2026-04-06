"use client";

import { ShoppingCart } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const orders = [
  { id: "ORD-2026-001", date: "2026-03-28", campaign: "Spring Homeowner Mailer", status: "Delivered", amount: "$4,250.00" },
  { id: "ORD-2026-002", date: "2026-03-15", campaign: "South Florida Prospecting", status: "In Production", amount: "$3,800.00" },
  { id: "ORD-2026-003", date: "2026-03-01", campaign: "Investor Lead Gen Q2", status: "Shipped", amount: "$2,950.00" },
  { id: "ORD-2026-004", date: "2026-02-20", campaign: "Geo-Targeted Retargeting Push", status: "Delivered", amount: "$1,600.00" },
  { id: "ORD-2026-005", date: "2026-02-10", campaign: "Luxury Home Seller Campaign", status: "Delivered", amount: "$5,100.00" },
];

const statusColors: Record<string, string> = {
  Delivered: "bg-emerald-100 text-emerald-700",
  "In Production": "bg-amber-100 text-amber-700",
  Shipped: "bg-blue-100 text-blue-700",
};

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">Track your print and campaign orders</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{new Date(order.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</TableCell>
                <TableCell>{order.campaign}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
                    {order.status}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">{order.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
