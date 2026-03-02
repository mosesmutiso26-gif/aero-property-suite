import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const Payments = () => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = role === 'super_admin';
  const isCaretaker = role === 'caretaker';
  const isTenant = role === 'tenant';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tenant_id: '', invoice_id: '', amount: 0, payment_method: 'mpesa', reference_number: '' });
  const { user } = useAuth();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // For tenants, get their tenant id
  const { data: myTenant } = useQuery({
    queryKey: ['my-tenant-id', user?.id],
    enabled: isTenant && !!user,
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id').eq('user_id', user!.id).eq('is_active', true).maybeSingle();
      return data;
    },
  });

  // For super admin, get tenants list
  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-payments'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data: tenantData } = await supabase.from('tenants').select('id, user_id').eq('is_active', true);
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
      const tenantId = isTenant ? myTenant?.id : form.tenant_id;
      if (!tenantId) throw new Error('No tenant selected');
      const payload: any = {
        tenant_id: tenantId,
        amount: form.amount,
        payment_method: form.payment_method,
        reference_number: form.reference_number,
      };
      if (form.invoice_id) payload.invoice_id = form.invoice_id;
      const { error } = await supabase.from('payments').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment recorded');
      setShowForm(false);
      setForm({ tenant_id: '', invoice_id: '', amount: 0, payment_method: 'mpesa', reference_number: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canCreate = isSuperAdmin || (isTenant && myTenant);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Payments</h1>
        {canCreate && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Record Payment
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div className="aero-glass rounded-lg w-full max-w-md animate-aero-fade-in">
            <div className="aero-title-bar rounded-t-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-sidebar-foreground">Record Payment</span>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-sidebar-foreground/70" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="p-5 space-y-4">
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Tenant</label>
                  <select className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} required>
                    <option value="">Select tenant</option>
                    {tenants?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (KES)</label>
                <input type="number" className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} min={0} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Method</label>
                <select className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                  <option value="mpesa">M-PESA</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Reference Number</label>
                <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} placeholder="e.g. MPESA code" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 aero-button rounded-md px-4 py-2 text-sm text-foreground">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {createMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="aero-glass rounded-lg p-8 text-center animate-pulse"><div className="h-4 w-32 bg-muted rounded mx-auto" /></div>
      ) : !payments?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No payments recorded.</p>
        </div>
      ) : (
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-foreground">KES {Number(p.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{p.payment_method}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.reference_number || '-'}</td>
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

export default Payments;
