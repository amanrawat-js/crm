"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { STAGE_COLORS, STAGE_LABELS, SOURCE_LABELS, formatCurrency, getRelativeTime } from "@/lib/utils";

interface Lead {
  id: string; name: string; email: string | null; phone: string | null;
  source: string; stage: string; propertyInterest: string | null;
  budget: number | null; location: string | null; createdAt: string;
  assignedTo: { id: string; name: string; email: string } | null;
  _count: { activities: number; followUps: number };
}

export default function LeadsPage() {
  const { data: session } = useSession();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<{id:string;name:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    name:"",email:"",phone:"",source:"OTHER",propertyInterest:"",budget:"",location:"",notes:"",assignedToId:""
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{created:number;failed:number;errors:{row:number;message:string}[]} | null>(null);
  const isAdmin = session?.user?.role === "ADMIN";

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (stageFilter) p.set("stage", stageFilter);
    if (sourceFilter) p.set("source", sourceFilter);
    p.set("page", page.toString());
    const res = await fetch(`/api/leads?${p}`);
    const data = await res.json();
    setLeads(data.leads||[]);
    setTotalPages(data.pagination?.totalPages||1);
    setTotal(data.pagination?.total||0);
    setLoading(false);
  }, [search, stageFilter, sourceFilter, page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => {
    if(!isAdmin) return;
    fetch("/api/users").then(r=>r.json()).then(d=>setAgents(d.users||[]));
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      if(res.ok){setShowModal(false);setForm({name:"",email:"",phone:"",source:"OTHER",propertyInterest:"",budget:"",location:"",notes:"",assignedToId:""});fetchLeads();}
    } finally { setSaving(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (stageFilter) p.set("stage", stageFilter);
      if (sourceFilter) p.set("source", sourceFilter);
      const res = await fetch(`/api/leads/export?${p}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch("/api/leads/import", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        setImportFile(null);
        fetchLeads();
      } else {
        setImportResult({
          created: data.created ?? 0,
          failed: data.failed ?? data.errors?.length ?? 1,
          errors: data.errors ?? [{ row: 0, message: data.error ?? "Import failed" }],
        });
      }
    } finally {
      setImporting(false);
    }
  };

  const openImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
  };

  const stageOpts = [{value:"",label:"All Stages"},...Object.entries(STAGE_LABELS).map(([v,l])=>({value:v,label:l}))];
  const sourceOpts = [{value:"",label:"All Sources"},...Object.entries(SOURCE_LABELS).map(([v,l])=>({value:v,label:l}))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-sm text-slate-400 mt-1">{total} lead{total!==1?"s":""} total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={openImportModal}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>

            Import
          </Button>
          <Button variant="outline" onClick={handleExport} isLoading={exporting}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>

            Export CSV
          </Button>
          <Button onClick={()=>setShowModal(true)}>
            
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Add Lead
          </Button>
        </div>
      </div>

      <Card><CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input placeholder="Search leads..." value={search} onChange={e=>setSearch(e.target.value)}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}/>
          <Select options={stageOpts} value={stageFilter} onChange={e=>setStageFilter(e.target.value)}/>
          <Select options={sourceOpts} value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}/>
        </div>
      </CardContent></Card>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : leads.length===0 ? (
          <EmptyState icon="🏠" title="No leads found" description="Create your first lead to start tracking your sales pipeline."
            action={<Button onClick={()=>setShowModal(true)}>Add Lead</Button>}/>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Lead</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Stage</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden lg:table-cell">Budget</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider hidden xl:table-cell">Assigned</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Added</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-700/30">
                {leads.map(lead=>(
                  <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4"><Link href={`/leads/${lead.id}`} className="group">
                      <p className="text-sm font-medium text-white group-hover:text-teal-400 transition-colors">{lead.name}</p>
                      {lead.propertyInterest&&<p className="text-xs text-slate-500 mt-0.5">{lead.propertyInterest}</p>}
                    </Link></td>
                    <td className="px-6 py-4 hidden md:table-cell"><p className="text-sm text-slate-300">{lead.email||"—"}</p><p className="text-xs text-slate-500">{lead.phone||""}</p></td>
                    <td className="px-6 py-4"><Badge className={STAGE_COLORS[lead.stage]}>{STAGE_LABELS[lead.stage]}</Badge></td>
                    <td className="px-6 py-4 hidden lg:table-cell"><span className="text-sm text-slate-300">{lead.budget?formatCurrency(lead.budget):"—"}</span></td>
                    <td className="px-6 py-4 hidden xl:table-cell"><span className="text-sm text-slate-400">{lead.assignedTo?.name||"Unassigned"}</span></td>
                    <td className="px-6 py-4"><span className="text-xs text-slate-500">{getRelativeTime(lead.createdAt)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Add New Lead" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
            <Input label="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
            <Input label="Phone" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
            <Select label="Lead Source" value={form.source} onChange={e=>setForm({...form,source:e.target.value})}
              options={Object.entries(SOURCE_LABELS).map(([v,l])=>({value:v,label:l}))}/>
            <Input label="Property Interest" value={form.propertyInterest} onChange={e=>setForm({...form,propertyInterest:e.target.value})} placeholder="e.g. 3BHK Apartment"/>
            <Input label="Budget" type="number" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} placeholder="e.g. 5000000"/>
            <Input label="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="e.g. Mumbai"/>
            {isAdmin&&agents.length>0&&<Select label="Assign to" value={form.assignedToId} onChange={e=>setForm({...form,assignedToId:e.target.value})}
              options={[{value:"",label:"Assign to me"},...agents.map(a=>({value:a.id,label:a.name}))]}/>}
          </div>
          <div><label className="block text-sm font-medium text-slate-300 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3}
              className="w-full rounded-xl bg-slate-800/50 border border-slate-700 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all" placeholder="Additional notes..."/>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={()=>setShowModal(false)}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Create Lead</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showImportModal} onClose={()=>setShowImportModal(false)} title="Import Leads" size="lg">
        <form onSubmit={handleImport} className="space-y-4">
          <p className="text-sm text-slate-400">
            Upload a CSV or Excel file (.csv, .xlsx, .xls). Each row needs at least a name.
            {isAdmin ? " Admins can set assignee via the assignedToEmail column." : " Imported leads are assigned to you."}
          </p>
          <a
            href="/api/leads/import"
            className="inline-flex items-center gap-1.5 text-sm text-teal-400 hover:text-teal-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Download template CSV
          </a>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Select file</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 file:cursor-pointer"
            />
          </div>
          {importResult && (
            <div className={`rounded-xl border p-4 text-sm ${importResult.failed > 0 ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
              <p className="text-slate-200 font-medium">
                {importResult.created} lead{importResult.created !== 1 ? "s" : ""} imported
                {importResult.failed > 0 && `, ${importResult.failed} failed`}
              </p>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-slate-400 max-h-32 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <li key={i}>{err.row > 0 ? `Row ${err.row}: ` : ""}{err.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={()=>setShowImportModal(false)}>Close</Button>
            <Button type="submit" isLoading={importing} disabled={!importFile}>Import Leads</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
