import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const Complaints = () => {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const isTenant = role === 'tenant';
  const isSuperAdmin = role === 'super_admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '' });

  const { data: myTenant } = useQuery({
    queryKey: ['my-tenant-for-complaints', user?.id],
    enabled: isTenant && !!user,
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id, unit_id, property_id').eq('user_id', user!.id).eq('is_active', true).maybeSingle();
      return data;
    },
  });

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get tenant names for admin view
  const { data: tenantNames } = useQuery({
    queryKey: ['tenant-names-complaints'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data: tenants } = await supabase.from('tenants').select('id, user_id');
      if (!tenants?.length) return {};
      const userIds = tenants.map(t => t.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const map: Record<string, string> = {};
      tenants.forEach(t => {
        const p = profiles?.find(pr => pr.user_id === t.user_id);
        map[t.id] = p?.full_name || 'Unknown';
      });
      return map;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!myTenant) throw new Error('No tenant record found');
      if (!myTenant.unit_id || !myTenant.property_id) throw new Error('You are not assigned to a unit yet');
      const { error } = await supabase.from('complaints').insert({
        tenant_id: myTenant.id,
        unit_id: myTenant.unit_id,
        property_id: myTenant.property_id,
        subject: form.subject,
        description: form.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Complaint submitted');
      setShowForm(false);
      setForm({ subject: '', description: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('complaints').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Status updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColor: Record<string, string> = {
    open: 'bg-aero-warning/10 text-aero-warning',
    in_progress: 'bg-primary/10 text-primary',
    resolved: 'bg-aero-success/10 text-aero-success',
    closed: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Complaints</h1>
        {isTenant && myTenant && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> New Complaint
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div className="aero-glass rounded-lg w-full max-w-md animate-aero-fade-in">
            <div className="aero-title-bar rounded-t-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-sidebar-foreground">Submit Complaint</span>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-sidebar-foreground/70" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Subject</label>
                <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Noisy neighbors" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none resize-none" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 aero-button rounded-md px-4 py-2 text-sm text-foreground">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {createMutation.isPending ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="aero-glass rounded-lg p-8 text-center animate-pulse"><div className="h-4 w-32 bg-muted rounded mx-auto" /></div>
      ) : !complaints?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No complaints filed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c: any) => (
            <div key={c.id} className="aero-glass rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{c.subject}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${statusColor[c.status] || statusColor.open}`}>{c.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    {isSuperAdmin && tenantNames && <span>• Tenant: {tenantNames[c.tenant_id] || 'Unknown'}</span>}
                  </div>
                </div>
                {(isSuperAdmin || role === 'caretaker') && c.status !== 'resolved' && c.status !== 'closed' && (
                  <select
                    className="aero-input rounded px-2 py-1 text-xs text-foreground"
                    value={c.status}
                    onChange={(e) => updateStatus.mutate({ id: c.id, status: e.target.value })}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Complaints;
