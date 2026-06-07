"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, getRelativeTime, STAGE_COLORS, STAGE_LABELS, SOURCE_LABELS, ACTIVITY_ICONS } from "@/lib/utils";

interface DashboardData {
  kpis: {
    totalLeads: number;
    pipelineValue: number;
    conversionRate: string;
    upcomingFollowUps: number;
    overdueFollowUps: number;
  };
  stageCounts: { stage: string; count: number }[];
  sourceCounts: { source: string; count: number }[];
  recentLeads: Array<{
    id: string;
    name: string;
    email: string;
    stage: string;
    budget: number | null;
    createdAt: string;
    assignedTo: { id: string; name: string } | null;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    createdAt: string;
    lead: { id: string; name: string };
    createdBy: { id: string; name: string };
  }>;
  upcomingFollowUpsList: Array<{
    id: string;
    title: string;
    dueDate: string;
    lead: { id: string; name: string };
    assignedTo: { id: string; name: string };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    {
      label: "Total Leads",
      value: data.kpis.totalLeads.toString(),
      icon: "👥",
      gradient: "from-teal-500/20 to-teal-500/5",
      border: "border-teal-500/20",
    },
    {
      label: "Pipeline Value",
      value: formatCurrency(data.kpis.pipelineValue),
      icon: "💰",
      gradient: "from-blue-500/20 to-blue-500/5",
      border: "border-blue-500/20",
    },
    {
      label: "Conversion Rate",
      value: `${data.kpis.conversionRate}%`,
      icon: "📈",
      gradient: "from-emerald-500/20 to-emerald-500/5",
      border: "border-emerald-500/20",
    },
    {
      label: "Pending Follow-ups",
      value: data.kpis.upcomingFollowUps.toString(),
      icon: "📅",
      gradient: "from-amber-500/20 to-amber-500/5",
      border: "border-amber-500/20",
      extra: data.kpis.overdueFollowUps > 0 ? `${data.kpis.overdueFollowUps} overdue` : undefined,
    },
  ];

  const maxStageCount = Math.max(...data.stageCounts.map((s) => s.count), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Overview of your real estate pipeline</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <Card key={kpi.label} className={`animate-slide-up stagger-${i + 1} opacity-0`}>
            <CardContent className="p-5">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.gradient} border ${kpi.border} mb-3`}>
                <span className="text-lg">{kpi.icon}</span>
              </div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{kpi.value}</p>
              {kpi.extra && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {kpi.extra}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline Stage Distribution */}
        <Card className="animate-slide-up stagger-5 opacity-0">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-white">Pipeline Stages</h3>
          </div>
          <CardContent>
            <div className="space-y-3">
              {["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].map((stage) => {
                const count = data.stageCounts.find((s) => s.stage === stage)?.count || 0;
                const pct = (count / maxStageCount) * 100;
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-24 shrink-0">{STAGE_LABELS[stage]}</span>
                    <div className="flex-1 h-6 bg-slate-800/50 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg bg-gradient-to-r from-teal-500/60 to-blue-500/60 transition-all duration-700 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(pct, count > 0 ? 12 : 0)}%` }}
                      >
                        {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lead Source Distribution */}
        <Card className="animate-slide-up stagger-6 opacity-0">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-white">Lead Sources</h3>
          </div>
          <CardContent>
            {data.sourceCounts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {data.sourceCounts.map((s) => (
                  <div key={s.source} className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
                    <p className="text-lg font-bold text-white">{s.count}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{SOURCE_LABELS[s.source] || s.source}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500">No lead data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Leads */}
        <Card className="lg:col-span-2">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recent Leads</h3>
            <Link href="/leads" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
              View all →
            </Link>
          </div>
          <CardContent className="p-0">
            {data.recentLeads.length > 0 ? (
              <div className="divide-y divide-slate-700/30">
                {data.recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.email || "No email"}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge className={STAGE_COLORS[lead.stage]}>
                        {STAGE_LABELS[lead.stage]}
                      </Badge>
                      <span className="text-xs text-slate-500">{getRelativeTime(lead.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500">No leads yet</p>
                <Link href="/leads" className="text-xs text-teal-400 hover:text-teal-300 mt-1 inline-block">
                  Create your first lead →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Upcoming Follow-ups */}
          <Card>
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Upcoming Follow-ups</h3>
              <Link href="/follow-ups" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                View all →
              </Link>
            </div>
            <CardContent className="p-0">
              {data.upcomingFollowUpsList.length > 0 ? (
                <div className="divide-y divide-slate-700/30">
                  {data.upcomingFollowUpsList.map((fu) => (
                    <div key={fu.id} className="px-6 py-3">
                      <p className="text-sm font-medium text-white">{fu.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">📅 {formatDate(fu.dueDate)}</span>
                        <span className="text-xs text-slate-600">•</span>
                        <span className="text-xs text-slate-500">{fu.lead.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">No upcoming follow-ups</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
              <Link href="/activities" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                View all →
              </Link>
            </div>
            <CardContent className="p-0">
              {data.recentActivities.length > 0 ? (
                <div className="divide-y divide-slate-700/30">
                  {data.recentActivities.map((act) => (
                    <div key={act.id} className="px-6 py-3 flex items-start gap-3">
                      <span className="text-base mt-0.5">{ACTIVITY_ICONS[act.type] || "📌"}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{act.title}</p>
                        <p className="text-xs text-slate-500">{act.lead.name} • {getRelativeTime(act.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">No activity yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
