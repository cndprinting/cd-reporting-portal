"use client";

import { Building2, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

const companies = [
  { id: 1, name: "C&D Printing Demo Account", industry: "Printing & Direct Mail", status: "Active", campaigns: 2 },
  { id: 2, name: "Sunshine Realty Group", industry: "Real Estate", status: "Active", campaigns: 2 },
  { id: 3, name: "Palm Coast Insurance", industry: "Insurance", status: "Active", campaigns: 1 },
];

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="text-sm text-gray-500">Manage client companies and accounts</p>
          </div>
        </div>
        <Button className="bg-brand-600 hover:bg-brand-700 text-white">
          Add Company
        </Button>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Campaigns</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.industry}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    {company.status}
                  </span>
                </TableCell>
                <TableCell>{company.campaigns}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
