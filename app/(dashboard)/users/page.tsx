"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatDate, getInitials } from "@/lib/utils";

interface User {
  id:string;name:string;email:string;role:string;phone:string|null;isActive:boolean;createdAt:string;
  _count:{assignedLeads:number};
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({name:"",email:"",password:"",phone:"",role:"AGENT"});

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users||[]); setLoading(false);
  };

  useEffect(()=>{fetchUsers();},[]);

  const handleCreate = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch("/api/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      if(res.ok){setShowModal(false);setForm({name:"",email:"",password:"",phone:"",role:"AGENT"});fetchUsers();}
    } finally { setSaving(false); }
  };

  const toggleRole = async (id:string,currentRole:string) => {
    const newRole = currentRole==="ADMIN"?"AGENT":"ADMIN";
    await fetch("/api/users",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,role:newRole})});
    fetchUsers();
  };

  const toggleActive = async (id:string,isActive:boolean) => {
    await fetch("/api/users",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,isActive:!isActive})});
    fetchUsers();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-slate-400 mt-1">Manage team members and roles</p>
        </div>
        <Button onClick={()=>setShowModal(true)}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Add User
        </Button>
      </div>

      {/* User cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map(user=>(
            <Card key={user.id} hover className="animate-slide-up">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white
                    ${user.isActive?"bg-gradient-to-br from-teal-500 to-blue-500":"bg-slate-700"}`}>
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                      {!user.isActive&&<Badge variant="danger" className="text-[10px]">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={user.role==="ADMIN"?"purple":"info"}>{user.role}</Badge>
                      <span className="text-xs text-slate-500">{user._count.assignedLeads} leads</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/30">
                  <span className="text-xs text-slate-500 flex-1">Joined {formatDate(user.createdAt)}</span>
                  <Button variant="ghost" size="sm" onClick={()=>toggleRole(user.id,user.role)} className="text-xs">
                    {user.role==="ADMIN"?"→ Agent":"→ Admin"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={()=>toggleActive(user.id,user.isActive)}
                    className={`text-xs ${user.isActive?"text-red-400":"text-emerald-400"}`}>
                    {user.isActive?"Deactivate":"Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create User Modal */}
      <Modal isOpen={showModal} onClose={()=>setShowModal(false)} title="Add New User">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Full Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
          <Input label="Email *" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
          <Input label="Phone" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
          <Input label="Password *" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/>
          <Select label="Role" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}
            options={[{value:"AGENT",label:"Sales Agent"},{value:"ADMIN",label:"Admin"}]}/>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={()=>setShowModal(false)}>Cancel</Button>
            <Button type="submit" isLoading={saving}>Create User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
