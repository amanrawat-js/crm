"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { VoiceCallAnalysis } from "@/components/VoiceCallAnalysis";
import { STAGE_COLORS, STAGE_LABELS, SOURCE_LABELS, ACTIVITY_ICONS, formatCurrency, formatDate, formatDateTime, getRelativeTime } from "@/lib/utils";

interface LeadDetail {
  id:string;name:string;email:string|null;phone:string|null;source:string;stage:string;
  propertyInterest:string|null;budget:number|null;location:string|null;notes:string|null;
  createdAt:string;updatedAt:string;
  assignedTo:{id:string;name:string;email:string;phone:string|null}|null;
  activities:Array<{id:string;type:string;title:string;description:string|null;createdAt:string;createdBy:{id:string;name:string}}>;
  followUps:Array<{id:string;title:string;description:string|null;dueDate:string;completed:boolean;assignedTo:{id:string;name:string}}>;
}

const STAGES = ["NEW","CONTACTED","QUALIFIED","PROPOSAL","NEGOTIATION","WON","LOST"];

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [lead, setLead] = useState<LeadDetail|null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [editForm, setEditForm] = useState<Record<string,string>>({});
  const [actForm, setActForm] = useState({type:"CALL",title:"",description:""});
  const [fuForm, setFuForm] = useState({title:"",description:"",dueDate:""});
  const [agents, setAgents] = useState<{id:string;name:string}[]>([]);
  const isAdmin = session?.user?.role === "ADMIN";

  const fetchLead = async () => {
    const res = await fetch(`/api/leads/${id}`);
    if(!res.ok){ router.push("/leads"); return; }
    const data = await res.json();
    setLead(data); setLoading(false);
  };

  useEffect(()=>{fetchLead();},[id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEdit = async () => {
    if(!lead) return;
    setEditForm({name:lead.name,email:lead.email||"",phone:lead.phone||"",source:lead.source,stage:lead.stage,
      propertyInterest:lead.propertyInterest||"",budget:lead.budget?.toString()||"",location:lead.location||"",notes:lead.notes||"",
      assignedToId:lead.assignedTo?.id||""});
    if(isAdmin){
      try{
        const res = await fetch("/api/users");
        if(res.ok){ const data = await res.json(); setAgents(data.users?.map((u:{id:string;name:string})=>({id:u.id,name:u.name}))||[]); }
      }catch{/* ignore */}
    }
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/leads/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(editForm)});
    setEditing(false); setSaving(false); fetchLead();
  };

  const handleStageChange = async (stage:string) => {
    await fetch(`/api/leads/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...lead,stage})});
    fetchLead();
  };

  const handleDelete = async () => {
    if(!confirm("Are you sure you want to delete this lead?")) return;
    await fetch(`/api/leads/${id}`,{method:"DELETE"});
    router.push("/leads");
  };

  const handleAddActivity = async (e:React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/activities",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...actForm,leadId:id})});
    setShowActivityModal(false); setActForm({type:"CALL",title:"",description:""}); fetchLead();
  };

  const handleAddFollowUp = async (e:React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/follow-ups",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...fuForm,leadId:id})});
    setShowFollowUpModal(false); setFuForm({title:"",description:"",dueDate:""}); fetchLead();
  };

  const toggleFollowUp = async (fuId:string,completed:boolean) => {
    await fetch(`/api/follow-ups/${fuId}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({completed})});
    fetchLead();
  };

  if(loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/></div>;
  if(!lead) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={()=>router.push("/leads")} className="mb-2">← Back to Leads</Button>
          <h1 className="text-2xl font-bold text-white">{lead.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={STAGE_COLORS[lead.stage]}>{STAGE_LABELS[lead.stage]}</Badge>
            <span className="text-xs text-slate-500">Added {formatDate(lead.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={()=>setShowActivityModal(true)}>+ Activity</Button>
          <Button variant="outline" size="sm" onClick={()=>setShowFollowUpModal(true)}>+ Follow-up</Button>
          <Button size="sm" onClick={editing?handleSave:handleEdit} isLoading={saving}>{editing?"Save":"Edit"}</Button>
          {isAdmin && <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>}
        </div>
      </div>

      {/* Pipeline progress */}
      <Card><CardContent className="p-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STAGES.map((s,i)=>{
            const isCurrent = lead.stage===s;
            const isPast = STAGES.indexOf(lead.stage)>i;
            return (
              <button key={s} onClick={()=>handleStageChange(s)}
                className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer
                  ${isCurrent?"bg-gradient-to-r from-teal-500 to-blue-500 text-white shadow-lg":""}
                  ${isPast?"bg-teal-500/20 text-teal-400":""}
                  ${!isCurrent&&!isPast?"bg-slate-800/50 text-slate-500 hover:bg-slate-700/50":""}
                `}>
                {STAGE_LABELS[s]}
              </button>
            );
          })}
        </div>
      </CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Lead details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><h3 className="text-sm font-semibold text-white">Lead Information</h3></CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Name" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})}/>
                  <Input label="Email" value={editForm.email} onChange={e=>setEditForm({...editForm,email:e.target.value})}/>
                  <Input label="Phone" value={editForm.phone} onChange={e=>setEditForm({...editForm,phone:e.target.value})}/>
                  <Select label="Source" value={editForm.source} onChange={e=>setEditForm({...editForm,source:e.target.value})}
                    options={Object.entries(SOURCE_LABELS).map(([v,l])=>({value:v,label:l}))}/>
                  <Input label="Property Interest" value={editForm.propertyInterest} onChange={e=>setEditForm({...editForm,propertyInterest:e.target.value})}/>
                  <Input label="Budget" type="number" value={editForm.budget} onChange={e=>setEditForm({...editForm,budget:e.target.value})}/>
                  <Input label="Location" value={editForm.location} onChange={e=>setEditForm({...editForm,location:e.target.value})}/>
                  {isAdmin && (
                    <Select label="Assign To" value={editForm.assignedToId} onChange={e=>setEditForm({...editForm,assignedToId:e.target.value})}
                      options={[{value:"",label:"— Unassigned —"},...agents.map(a=>({value:a.id,label:a.name}))]}/>
                  )}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
                    <textarea value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})} rows={3}
                      className="w-full rounded-xl bg-slate-800/50 border border-slate-700 px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"/>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[["Email",lead.email],["Phone",lead.phone],["Source",SOURCE_LABELS[lead.source]],["Property",lead.propertyInterest],
                    ["Budget",lead.budget?formatCurrency(lead.budget):null],["Location",lead.location],
                    ["Assigned To",lead.assignedTo?.name],["Last Updated",formatDateTime(lead.updatedAt)]
                  ].map(([label,value])=>(
                    <div key={label as string}><p className="text-xs text-slate-500 mb-0.5">{label}</p><p className="text-sm text-slate-200">{value||"—"}</p></div>
                  ))}
                  {lead.notes&&<div className="col-span-2"><p className="text-xs text-slate-500 mb-0.5">Notes</p><p className="text-sm text-slate-300 whitespace-pre-line">{lead.notes}</p></div>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Voice Call Analysis */}
          <VoiceCallAnalysis leadId={id} onAnalysisComplete={fetchLead} />

          {/* Activity timeline */}
          <Card>
            <CardHeader><div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Activity Timeline</h3>
              <Button variant="ghost" size="sm" onClick={()=>setShowActivityModal(true)}>+ Add</Button>
            </div></CardHeader>
            <CardContent className="p-0">
              {lead.activities.length>0 ? (
                <div className="divide-y divide-slate-700/30">
                  {lead.activities.map(act=>(
                    <div key={act.id} className="px-6 py-3 flex gap-3">
                      <span className="text-lg mt-0.5">{ACTIVITY_ICONS[act.type]||"📌"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{act.title}</p>
                          <Badge variant="default" className="text-[10px]">{act.type}</Badge>
                        </div>
                        {act.description&&<p className="text-xs text-slate-400 mt-0.5">{act.description}</p>}
                        <p className="text-xs text-slate-500 mt-1">{act.createdBy.name} • {getRelativeTime(act.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-8"><p className="text-sm text-slate-500">No activities recorded yet</p></div>}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Follow-ups */}
        <div className="space-y-6">
          <Card>
            <CardHeader><div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Follow-ups</h3>
              <Button variant="ghost" size="sm" onClick={()=>setShowFollowUpModal(true)}>+ Add</Button>
            </div></CardHeader>
            <CardContent className="p-0">
              {lead.followUps.length>0 ? (
                <div className="divide-y divide-slate-700/30">
                  {lead.followUps.map(fu=>{
                    const isOverdue = !fu.completed && new Date(fu.dueDate)<new Date();
                    return (
                      <div key={fu.id} className="px-6 py-3">
                        <div className="flex items-start gap-3">
                          <button onClick={()=>toggleFollowUp(fu.id,!fu.completed)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer
                              ${fu.completed?"bg-teal-500 border-teal-500":"border-slate-600 hover:border-teal-500"}`}>
                            {fu.completed&&<svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                          </button>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${fu.completed?"text-slate-500 line-through":"text-white"}`}>{fu.title}</p>
                            {fu.description&&<p className="text-xs text-slate-400 mt-0.5">{fu.description}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs ${isOverdue?"text-red-400":"text-slate-500"}`}>📅 {formatDate(fu.dueDate)}</span>
                              {isOverdue&&<Badge variant="danger" className="text-[10px]">Overdue</Badge>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="text-center py-8"><p className="text-sm text-slate-500">No follow-ups scheduled</p></div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity Modal */}
      <Modal isOpen={showActivityModal} onClose={()=>setShowActivityModal(false)} title="Log Activity">
        <form onSubmit={handleAddActivity} className="space-y-4">
          <Select label="Activity Type" value={actForm.type} onChange={e=>setActForm({...actForm,type:e.target.value})}
            options={[{value:"CALL",label:"📞 Call"},{value:"EMAIL",label:"✉️ Email"},{value:"MEETING",label:"🤝 Meeting"},{value:"SITE_VISIT",label:"🏠 Site Visit"},{value:"NOTE",label:"📝 Note"}]}/>
          <Input label="Title *" value={actForm.title} onChange={e=>setActForm({...actForm,title:e.target.value})} required placeholder="e.g. Discussed pricing"/>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea value={actForm.description} onChange={e=>setActForm({...actForm,description:e.target.value})} rows={3}
              className="w-full rounded-xl bg-slate-800/50 border border-slate-700 px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all" placeholder="Details..."/>
          </div>
          <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={()=>setShowActivityModal(false)}>Cancel</Button><Button type="submit">Log Activity</Button></div>
        </form>
      </Modal>

      {/* Follow-up Modal */}
      <Modal isOpen={showFollowUpModal} onClose={()=>setShowFollowUpModal(false)} title="Schedule Follow-up">
        <form onSubmit={handleAddFollowUp} className="space-y-4">
          <Input label="Title *" value={fuForm.title} onChange={e=>setFuForm({...fuForm,title:e.target.value})} required placeholder="e.g. Send proposal"/>
          <Input label="Due Date *" type="datetime-local" value={fuForm.dueDate} onChange={e=>setFuForm({...fuForm,dueDate:e.target.value})} required/>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <textarea value={fuForm.description} onChange={e=>setFuForm({...fuForm,description:e.target.value})} rows={3}
              className="w-full rounded-xl bg-slate-800/50 border border-slate-700 px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"/>
          </div>
          <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={()=>setShowFollowUpModal(false)}>Cancel</Button><Button type="submit">Schedule</Button></div>
        </form>
      </Modal>
    </div>
  );
}
