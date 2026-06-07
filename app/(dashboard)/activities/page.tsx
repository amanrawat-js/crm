"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { ACTIVITY_ICONS, getRelativeTime } from "@/lib/utils";

interface Activity {
  id:string;type:string;title:string;description:string|null;createdAt:string;
  lead:{id:string;name:string};createdBy:{id:string;name:string};
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if(typeFilter) p.set("type", typeFilter);
    p.set("page", page.toString());
    const res = await fetch(`/api/activities?${p}`);
    const data = await res.json();
    setActivities(data.activities||[]);
    setTotalPages(data.pagination?.totalPages||1);
    setTotal(data.pagination?.total||0);
    setLoading(false);
  }, [typeFilter, page]);

  useEffect(()=>{fetchData();},[fetchData]);

  const typeOpts = [
    {value:"",label:"All Types"},
    {value:"CALL",label:"📞 Call"},{value:"EMAIL",label:"✉️ Email"},
    {value:"MEETING",label:"🤝 Meeting"},{value:"SITE_VISIT",label:"🏠 Site Visit"},
    {value:"NOTE",label:"📝 Note"},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Activities</h1>
          <p className="text-sm text-slate-400 mt-1">{total} activit{total!==1?"ies":"y"} recorded</p>
        </div>
        <div className="w-48">
          <Select options={typeOpts} value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);setPage(1);}}/>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : activities.length===0 ? (
          <EmptyState icon="📋" title="No activities found" description="Activities will appear here when you log calls, emails, meetings, and notes against leads."/>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {activities.map(act=>(
              <div key={act.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-lg shrink-0">
                  {ACTIVITY_ICONS[act.type]||"📌"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white">{act.title}</p>
                    <Badge variant="default" className="text-[10px]">{act.type.replace("_"," ")}</Badge>
                  </div>
                  {act.description&&<p className="text-xs text-slate-400 mt-1">{act.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <Link href={`/leads/${act.lead.id}`} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
                      🏠 {act.lead.name}
                    </Link>
                    <span className="text-xs text-slate-500">👤 {act.createdBy.name}</span>
                    <span className="text-xs text-slate-500">🕐 {getRelativeTime(act.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages>1&&(
          <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between">
            <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</Button>
              <Button variant="ghost" size="sm" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
