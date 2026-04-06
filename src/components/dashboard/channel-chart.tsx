"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatNumber, getChannelLabel } from "@/lib/utils";

const COLORS = [
  "#1e40af", "#0d9488", "#d97706", "#dc2626",
  "#7c3aed", "#2563eb", "#059669", "#ea580c",
];

interface TimeSeriesChartProps {
  data: { date: string; impressions: number; clicks: number; leads: number }[];
  height?: number;
}

export function TimeSeriesChart({ data, height = 300 }: TimeSeriesChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="impressionsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1e40af" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontSize: "12px",
          }}
          formatter={(value) => [formatNumber(Number(value))]}
        />
        <Area
          type="monotone"
          dataKey="impressions"
          stroke="#1e40af"
          strokeWidth={2}
          fill="url(#impressionsGrad)"
          name="Impressions"
        />
        <Area
          type="monotone"
          dataKey="clicks"
          stroke="#0d9488"
          strokeWidth={2}
          fill="url(#clicksGrad)"
          name="Clicks"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface ChannelBarChartProps {
  data: Record<string, { impressions: number; clicks: number }>;
  height?: number;
}

export function ChannelBarChart({ data, height = 300 }: ChannelBarChartProps) {
  const chartData = Object.entries(data).map(([channel, metrics]) => ({
    channel: getChannelLabel(channel),
    impressions: metrics.impressions,
    clicks: metrics.clicks,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="channel" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontSize: "12px",
          }}
          formatter={(value) => [formatNumber(Number(value))]}
        />
        <Bar dataKey="impressions" fill="#1e40af" radius={[4, 4, 0, 0]} name="Ad Displays" />
        <Bar dataKey="clicks" fill="#0d9488" radius={[4, 4, 0, 0]} name="Clicks" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface ChannelPieChartProps {
  data: Record<string, { impressions: number }>;
  height?: number;
}

export function ChannelPieChart({ data, height = 250 }: ChannelPieChartProps) {
  const chartData = Object.entries(data)
    .filter(([, m]) => m.impressions > 0)
    .map(([channel, metrics]) => ({
      name: getChannelLabel(channel),
      value: metrics.impressions,
    }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [formatNumber(Number(value)), "Impressions"]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
