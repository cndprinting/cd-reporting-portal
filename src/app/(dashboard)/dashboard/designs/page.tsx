"use client";

import { Palette, Upload } from "lucide-react";

export default function DesignsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-brand-100 text-brand-600">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Designs</h1>
          <p className="text-sm text-gray-500">Upload and manage your creative assets here.</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-brand-400 transition-colors">
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">Drag and drop files here, or click to upload</p>
        <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 50MB</p>
      </div>

      {/* Design Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <Palette className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Mailer Design Preview</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm font-medium text-gray-900">Design {i + 1}</p>
              <p className="text-xs text-gray-500 mt-0.5">Uploaded Mar {10 + i}, 2026</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
