import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard, Plus, X, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

const Payments = () => {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = role === 'super_admin';
  const isCaretaker = role === 'caretaker';
  const isTenant = role === 'tenant';
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [form, setForm] = useState({
    tenant_id: '',
    amount: 0,
    payment_method: 'mpesa',
    reference_number: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
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

  // For caretaker/super admin, get tenants with names
  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-payments', role],
    enabled: isSuperAdmin || isCaretaker,
    queryFn: async () => {
      const { data: tenantData } = await supabase.from('tenants').select('id, user_id, property_id').eq('is_active', true);
      if (!tenantData?.length) return [];
      const userIds = tenantData.map(t => t.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p.full_name; });

      // Get unit info
      const propertyIds = [...new Set(tenantData.filter(t => t.property_id).map(t => t.property_id!))];
      const { data: properties } = propertyIds.length
        ? await supabase.from('properties').select('id, name').in('id', propertyIds)
        : { data: [] };
      const propMap: Record<string, string> = {};
      properties?.forEach(p => { propMap[p.id] = p.name; });

      return tenantData.map(t => ({
        ...t,
        name: profileMap[t.user_id] || 'Unknown',
        property_name: t.property_id ? propMap[t.property_id] || '' : '',
      }));
    },
  });

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

  // Build tenant name map for display
  const tenantNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    tenants?.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [tenants]);

  // Monthly totals
  const monthlyData = useMemo(() => {
    if (!payments) return { total: 0, count: 0, filtered: [] };
    const monthStart = startOfMonth(parseISO(selectedMonth + '-01'));
    const monthEnd = endOfMonth(monthStart);
    const filtered = payments.filter(p => {
      const d = new Date(p.payment_date);
      return d >= monthStart && d <= monthEnd;
    });
    const total = filtered.reduce((sum, p) => sum + Number(p.amount), 0);
    return { total, count: filtered.length, filtered };
  }, [payments, selectedMonth]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const tenantId = isTenant ? myTenant?.id : form.tenant_id;
      if (!tenantId) throw new Error('No tenant selected');
      if (form.amount <= 0) throw new Error('Amount must be greater than 0');
      const { error } = await supabase.from('payments').insert({
        tenant_id: tenantId,
        amount: form.amount,
        payment_method: form.payment_method,
        reference_number: form.reference_number,
        payment_date: form.payment_date,
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment recorded successfully');
      setShowForm(false);
      setForm({ tenant_id: '', amount: 0, payment_method: 'mpesa', reference_number: '', payment_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canCreate = isSuperAdmin || isCaretaker || (isTenant && myTenant);

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

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="aero-glass rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Selected Month</p>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold text-foreground focus:outline-none"
            />
          </div>
        </div>
        <div className="aero-glass rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-500/10">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Collected</p>
            <p className="text-lg font-bold text-foreground">KES {monthlyData.total.toLocaleString()}</p>
          </div>
        </div>
        <div className="aero-glass rounded-lg p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-500/10">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-lg font-bold text-foreground">{monthlyData.count}</p>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div className="aero-glass rounded-lg w-full max-w-md animate-aero-fade-in">
            <div className="aero-title-bar rounded-t-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-sidebar-foreground">Record Rent Payment</span>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-sidebar-foreground/70" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="p-5 space-y-4">
              {(isSuperAdmin || isCaretaker) && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Tenant</label>
                  <select className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} required>
                    <option value="">Select tenant</option>
                    {tenants?.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.property_name ? ` — ${t.property_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Date</label>
                <input
                  type="date"
                  className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none"
                  value={form.payment_date}
                  onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Amount (KES)</label>
                <input type="number" className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} min={1} required />
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
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes / Comment</label>
                <textarea
                  className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none min-h-[60px] resize-none"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Partial rent for March, balance pending"
                  maxLength={500}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 aero-button rounded-md px-4 py-2 text-sm text-foreground">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {createMutation.isPending ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments Table */}
      {isLoading ? (
        <div className="aero-glass rounded-lg p-8 text-center animate-pulse"><div className="h-4 w-32 bg-muted rounded mx-auto" /></div>
      ) : !monthlyData.filtered.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No payments for {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')}.</p>
        </div>
      ) : (
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                  {(isSuperAdmin || isCaretaker) && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Tenant</th>}
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Notes</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.filtered.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</td>
                    {(isSuperAdmin || isCaretaker) && <td className="px-4 py-3 text-foreground">{tenantNameMap[p.tenant_id] || p.tenant_id.slice(0, 8)}</td>}
                    <td className="px-4 py-3 font-medium text-foreground">KES {Number(p.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{p.payment_method}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.reference_number || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{p.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/30">
                  <td className="px-4 py-3 font-semibold text-foreground" colSpan={(isSuperAdmin || isCaretaker) ? 2 : 1}>Monthly Total</td>
                  <td className="px-4 py-3 font-bold text-foreground">KES {monthlyData.total.toLocaleString()}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
