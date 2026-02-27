import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, FileText, CreditCard, Wrench, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const MyUnit = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [maintForm, setMaintForm] = useState({ title: '', description: '', priority: 'medium' });

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['my-tenant', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, units(*, properties(name, address, city)), leases(*)')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: invoices } = useQuery({
    queryKey: ['my-invoices', tenant?.id],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('*').eq('tenant_id', tenant!.id).order('due_date', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const { data: payments } = useQuery({
    queryKey: ['my-payments', tenant?.id],
    queryFn: async () => {
      const { data } = await supabase.from('payments').select('*').eq('tenant_id', tenant!.id).order('payment_date', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const { data: maintenanceReqs } = useQuery({
    queryKey: ['my-maintenance', tenant?.id],
    queryFn: async () => {
      const { data } = await supabase.from('maintenance_requests').select('*').eq('tenant_id', tenant!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  const { data: notifications } = useQuery({
    queryKey: ['my-notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const submitMaint = useMutation({
    mutationFn: async () => {
      if (!tenant) throw new Error('No tenant record');
      const { error } = await supabase.from('maintenance_requests').insert({
        title: maintForm.title,
        description: maintForm.description,
        priority: maintForm.priority,
        tenant_id: tenant.id,
        unit_id: tenant.unit_id!,
        property_id: tenant.property_id!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-maintenance'] });
      toast.success('Maintenance request submitted');
      setShowMaintForm(false);
      setMaintForm({ title: '', description: '', priority: 'medium' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markNotifRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-notifications'] }),
  });

  const statusColor: Record<string, string> = {
    pending: 'bg-aero-warning/10 text-aero-warning',
    in_progress: 'bg-primary/10 text-primary',
    completed: 'bg-aero-success/10 text-aero-success',
    paid: 'bg-aero-success/10 text-aero-success',
    overdue: 'bg-destructive/10 text-destructive',
    partial: 'bg-primary/10 text-primary',
  };

  if (isLoading) return <div className="aero-glass rounded-lg p-8 animate-pulse"><div className="h-4 w-32 bg-muted rounded" /></div>;

  if (!tenant) {
    return (
      <div className="aero-glass rounded-lg p-8 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">You are not assigned to any unit yet.</p>
        <p className="text-xs text-muted-foreground mt-1">Contact your property manager for assistance.</p>
      </div>
    );
  }

  const unit = tenant.units as any;
  const lease = (tenant.leases as any)?.[0];
  const totalInvoiced = invoices?.reduce((s, i) => s + Number(i.amount), 0) || 0;
  const totalPaid = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
  const balance = totalInvoiced - totalPaid;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-foreground">My Unit</h1>

      {/* Unit + Lease + Balance cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Unit Details</span>
          </div>
          <p className="font-semibold text-foreground">Unit {unit?.unit_number}</p>
          <p className="text-xs text-muted-foreground">Floor {unit?.floor} • {unit?.bedrooms} bed • {unit?.bathrooms} bath</p>
          <p className="text-sm font-medium text-primary mt-1">KES {Number(unit?.rent_amount).toLocaleString()}/month</p>
          <p className="text-xs text-muted-foreground mt-1">{unit?.properties?.name} — {unit?.properties?.city}</p>
        </div>

        {lease && (
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-accent" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lease</span>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Period:</span> <span className="font-medium text-foreground">{new Date(lease.start_date).toLocaleDateString()} — {new Date(lease.end_date).toLocaleDateString()}</span></p>
              <p><span className="text-muted-foreground">Monthly:</span> <span className="font-medium text-foreground">KES {Number(lease.monthly_rent).toLocaleString()}</span></p>
              <p><span className="text-muted-foreground">Status:</span> <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${statusColor[lease.status] || ''}`}>{lease.status}</span></p>
            </div>
          </div>
        )}

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-aero-success" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Balance</span>
          </div>
          <p className={`text-2xl font-bold ${balance > 0 ? 'text-destructive' : 'text-aero-success'}`}>
            KES {balance.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Invoiced: KES {totalInvoiced.toLocaleString()} | Paid: KES {totalPaid.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Invoices */}
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="aero-toolbar px-4 py-2 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Recent Invoices</span>
          </div>
          <div className="p-3">
            {invoices?.length ? invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 text-sm">
                <div>
                  <p className="font-medium text-foreground">KES {Number(inv.amount).toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">Due: {new Date(inv.due_date).toLocaleDateString()}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor[inv.status] || ''}`}>{inv.status}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No invoices</p>}
          </div>
        </div>

        {/* Payment History */}
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="aero-toolbar px-4 py-2 flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Payment History</span>
          </div>
          <div className="p-3">
            {payments?.length ? payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 text-sm">
                <div>
                  <p className="font-medium text-foreground">KES {Number(p.amount).toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()} • {p.payment_method}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">{p.reference_number || '—'}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No payments</p>}
          </div>
        </div>

        {/* Maintenance Requests */}
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="aero-toolbar px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Maintenance</span>
            </div>
            <button onClick={() => setShowMaintForm(true)} className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline">
              <Plus className="h-3 w-3" /> New Request
            </button>
          </div>
          <div className="p-3">
            {maintenanceReqs?.length ? maintenanceReqs.map((m: any) => (
              <div key={m.id} className="py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{m.title}</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${statusColor[m.status] || ''}`}>{m.status.replace('_', ' ')}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{m.description}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No requests</p>}
          </div>
        </div>

        {/* Notifications */}
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="aero-toolbar px-4 py-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
          </div>
          <div className="p-3 max-h-60 overflow-y-auto">
            {notifications?.length ? notifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markNotifRead.mutate(n.id)}
                className={`py-2 border-b border-border/30 last:border-0 cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                  <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">No notifications</p>}
          </div>
        </div>
      </div>

      {/* Maintenance form modal */}
      {showMaintForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div className="aero-glass rounded-lg w-full max-w-md animate-aero-fade-in">
            <div className="aero-title-bar rounded-t-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-sidebar-foreground">New Maintenance Request</span>
              <button onClick={() => setShowMaintForm(false)}><X className="h-4 w-4 text-sidebar-foreground/70" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submitMaint.mutate(); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
                <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={maintForm.title} onChange={(e) => setMaintForm({ ...maintForm, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none resize-none" rows={3} value={maintForm.description} onChange={(e) => setMaintForm({ ...maintForm, description: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
                <select className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={maintForm.priority} onChange={(e) => setMaintForm({ ...maintForm, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMaintForm(false)} className="flex-1 aero-button rounded-md px-4 py-2 text-sm text-foreground">Cancel</button>
                <button type="submit" disabled={submitMaint.isPending} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                  {submitMaint.isPending ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyUnit;
