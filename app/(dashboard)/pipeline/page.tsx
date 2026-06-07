"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { STAGE_LABELS, formatCurrency } from "@/lib/utils";

interface PipelineLead {
  id:string;name:string;email:string|null;budget:number|null;propertyInterest:string|null;
  stage:string;assignedTo:{id:string;name:string}|null;
  _count:{activities:number;followUps:number};
}

const STAGES = ["NEW","CONTACTED","QUALIFIED","PROPOSAL","NEGOTIATION","WON","LOST"];
const STAGE_GRADIENT: Record<string,string> = {
  NEW:"from-blue-500/30 to-blue-500/10", CONTACTED:"from-cyan-500/30 to-cyan-500/10",
  QUALIFIED:"from-amber-500/30 to-amber-500/10", PROPOSAL:"from-purple-500/30 to-purple-500/10",
  NEGOTIATION:"from-orange-500/30 to-orange-500/10", WON:"from-emerald-500/30 to-emerald-500/10",
  LOST:"from-red-500/30 to-red-500/10",
};
const STAGE_DOT: Record<string,string> = {
  NEW:"bg-blue-400", CONTACTED:"bg-cyan-400", QUALIFIED:"bg-amber-400", PROPOSAL:"bg-purple-400",
  NEGOTIATION:"bg-orange-400", WON:"bg-emerald-400", LOST:"bg-red-400",
};

export default function PipelinePage() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const dragItem = useRef<string|null>(null);
  const [dragOverStage, setDragOverStage] = useState<string|null>(null);

  const fetchLeads = async () => {
    const res = await fetch("/api/leads?limit=200");
    const data = await res.json();
    setLeads(data.leads||[]); setLoading(false);
  };

  useEffect(()=>{fetchLeads();},[]);

  const handleDragStart = (leadId:string) => { dragItem.current=leadId; };
  const handleDragOver = (e:React.DragEvent,stage:string) => { e.preventDefault(); setDragOverStage(stage); };
  const handleDragLeave = () => { setDragOverStage(null); };
  const handleDrop = async (stage:string) => {
    setDragOverStage(null);
    if(!dragItem.current) return;
    const leadId = dragItem.current;
    dragItem.current = null;
    // Optimistic update
    setLeads(prev=>prev.map(l=>l.id===leadId?{...l,stage}:l));
    await fetch(`/api/leads/${leadId}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({stage})});
  };

  if(loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <p className="text-sm text-slate-400 mt-1">Drag and drop leads between stages</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{minHeight:"calc(100vh - 220px)"}}>
        {STAGES.map(stage=>{
          const stageLeads = leads.filter(l=>l.stage===stage);
          const totalValue = stageLeads.reduce((sum,l)=>sum+(l.budget||0),0);
          return (
            <div key={stage} className="flex-shrink-0 w-72"
              onDragOver={e=>handleDragOver(e,stage)} onDragLeave={handleDragLeave}
              onDrop={()=>handleDrop(stage)}>
              {/* Column header */}
              <div className={`rounded-t-xl p-3 bg-gradient-to-b ${STAGE_GRADIENT[stage]} border border-slate-700/30 border-b-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${STAGE_DOT[stage]}`}/>
                    <span className="text-sm font-semibold text-white">{STAGE_LABELS[stage]}</span>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-lg">{stageLeads.length}</span>
                </div>
                {totalValue>0&&<p className="text-xs text-slate-400 mt-1">{formatCurrency(totalValue)}</p>}
              </div>

              {/* Column body */}
              <div className={`rounded-b-xl border border-slate-700/30 border-t-0 p-2 space-y-2 min-h-[200px] transition-colors
                ${dragOverStage===stage?"bg-teal-500/5 border-teal-500/20":"bg-slate-900/30"}`}>
                {stageLeads.map(lead=>(
                  <div key={lead.id} draggable onDragStart={()=>handleDragStart(lead.id)}
                    className="group cursor-grab active:cursor-grabbing">
                    <Card hover className="!rounded-xl">
                      <div className="p-3">
                        <Link href={`/leads/${lead.id}`}>
                          <p className="text-sm font-medium text-white group-hover:text-teal-400 transition-colors">{lead.name}</p>
                        </Link>
                        {lead.propertyInterest&&<p className="text-xs text-slate-500 mt-0.5">{lead.propertyInterest}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">{lead.budget?formatCurrency(lead.budget):"No budget"}</span>
                          {lead.assignedTo&&(
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-[9px] font-bold text-white" title={lead.assignedTo.name}>
                              {lead.assignedTo.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                            </div>
                          )}
                        </div>
                        {(lead._count.activities>0||lead._count.followUps>0)&&(
                          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-700/30">
                            {lead._count.activities>0&&<span className="text-[10px] text-slate-500">📋 {lead._count.activities}</span>}
                            {lead._count.followUps>0&&<span className="text-[10px] text-slate-500">📅 {lead._count.followUps}</span>}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                ))}
                {stageLeads.length===0&&(
                  <div className="flex items-center justify-center h-20 text-xs text-slate-600">Drop leads here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
