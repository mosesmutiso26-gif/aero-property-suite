import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const statusColor: Record<string, string> = {
  pending: 'bg-aero-warning/10 text-aero-warning',
  paid: 'bg-aero-success/10 text-aero-success',
  overdue: 'bg-destructive/10 text-destructive',
  partial: 'bg-primary/10 text-primary',
};

const Invoices = () => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = role === 'super_admin';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tenant_id: '', unit_id: '', amount: 0, due_date: '', description: 'Monthly Rent' });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, units(unit_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-invoices'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data: tenantData } = await supabase.from('tenants').select('id, user_id, unit_id').eq('is_active', true);
      if (!tenantData?.length) return [];
      const userIds = tenantData.map(t => t.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p.full_name; });
      return tenantData.map(t => ({ ...t, name: profileMap[t.user_id] || 'Unknown' }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('invoices').insert({
        tenant_id: form.tenant_id,
        unit_id: form.unit_id,
        amount: form.amount,
        due_date: form.due_date,
        description: form.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
      setShowForm(false);
      setForm({ tenant_id: '', unit_id: '', amount: 0, due_date: '', description: 'Monthly Rent' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleTenantSelect = (tenantId: string) => {
    const t = tenants?.find(x => x.id === tenantId);
    setForm({ ...form, tenant_id: tenantId, unit_id: t?.unit_id || '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Invoices</h1>
        {isSuperAdmin && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Create Invoice
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div className="aero-glass rounded-lg w-full max-w-md animate-aero-fade-in">
            <div className="aero-title-bar rounded-t-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-sidebar-foreground">New Invoice</span>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-sidebar-foreground/70" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tenant</label>
                <select className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.tenant_id} onChange={(e) => handleTenantSelect(e.target.value)} required>
                  <option value="">Select tenant</option>
                  {tenants?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (KES)</label>
                <input type="number" className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} min={0} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Due Date</label>
                <input type="date" className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 aero-button rounded-md px-4 py-2 text-sm text-foreground">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="aero-glass rounded-lg p-8 text-center animate-pulse"><div className="h-4 w-32 bg-muted rounded mx-auto" /></div>
      ) : !invoices?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No invoices yet.</p>
        </div>
      ) : (
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Description</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{inv.units?.unit_number}</td>
                    <td className="px-4 py-3 text-foreground font-medium">KES {Number(inv.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(inv.due_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor[inv.status] || ''}`}>{inv.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{inv.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
