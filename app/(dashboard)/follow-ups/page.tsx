"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

interface FollowUp {
  id:string;title:string;description:string|null;dueDate:string;completed:boolean;
  lead:{id:string;name:string};assignedTo:{id:string;name:string};
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set("status", filter);
    p.set("page", page.toString());
    const res = await fetch(`/api/follow-ups?${p}`);
    const data = await res.json();
    setFollowUps(data.followUps||[]);
    setTotalPages(data.pagination?.totalPages||1);
    setLoading(false);
  }, [filter, page]);

  useEffect(()=>{fetchData();},[fetchData]);

  const toggleComplete = async (id:string,completed:boolean) => {
    await fetch(`/api/follow-ups/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({completed})});
    fetchData();
  };

  const deleteFollowUp = async (id:string) => {
    if(!confirm("Delete this follow-up?")) return;
    await fetch(`/api/follow-ups/${id}`,{method:"DELETE"});
    fetchData();
  };

  const tabs = [
    {key:"pending",label:"Pending",icon:"⏳"},
    {key:"overdue",label:"Overdue",icon:"🔴"},
    {key:"completed",label:"Completed",icon:"✅"},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Follow-ups</h1>
        <p className="text-sm text-slate-400 mt-1">Track and manage your scheduled follow-ups</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl w-fit">
        {tabs.map(tab=>(
          <button key={tab.key} onClick={()=>{setFilter(tab.key);setPage(1);}}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer
              ${filter===tab.key?"bg-slate-700 text-white shadow-sm":"text-slate-400 hover:text-slate-300"}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : followUps.length===0 ? (
          <EmptyState icon="📅" title={`No ${filter} follow-ups`}
            description={filter==="pending"?"All caught up! No pending follow-ups.":"No follow-ups found for this filter."}/>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {followUps.map(fu=>{
              const isOverdue = !fu.completed && new Date(fu.dueDate)<new Date();
              return (
                <div key={fu.id} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                  <button onClick={()=>toggleComplete(fu.id,!fu.completed)}
                    className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer
                      ${fu.completed?"bg-teal-500 border-teal-500":"border-slate-600 hover:border-teal-500"}`}>
                    {fu.completed&&<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${fu.completed?"text-slate-500 line-through":"text-white"}`}>{fu.title}</p>
                    {fu.description&&<p className="text-xs text-slate-400 mt-0.5">{fu.description}</p>}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                      <span className={`text-xs ${isOverdue?"text-red-400 font-medium":"text-slate-500"}`}>📅 {formatDate(fu.dueDate)}</span>
                      {isOverdue&&<Badge variant="danger" className="text-[10px]">Overdue</Badge>}
                      <Link href={`/leads/${fu.lead.id}`} className="text-xs text-teal-400 hover:text-teal-300 transition-colors">🏠 {fu.lead.name}</Link>
                      <span className="text-xs text-slate-500">👤 {fu.assignedTo.name}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={()=>deleteFollowUp(fu.id)} className="text-slate-500 hover:text-red-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </Button>
                </div>
              );
            })}
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
