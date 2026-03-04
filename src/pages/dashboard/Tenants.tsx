import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Plus, X, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const Tenants = () => {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const isCaretaker = role === 'caretaker';
  const isSuperAdmin = role === 'super_admin';
  const canAddTenant = isSuperAdmin || isCaretaker;
  const [showForm, setShowForm] = useState(false);
  const [showLedger, setShowLedger] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', id_number: '', property_id: '', unit_id: '', move_in_date: '' });

  // Properties the user can manage
  const { data: properties } = useQuery({
    queryKey: ['managed-properties', user?.id],
    enabled: canAddTenant && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('properties').select('id, name');
      if (error) throw error;
      return data || [];
    },
  });

  // Units for selected property
  const { data: units } = useQuery({
    queryKey: ['units-for-property', form.property_id],
    enabled: !!form.property_id,
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('id, unit_number').eq('property_id', form.property_id).eq('is_occupied', false);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data: tenantData, error } = await supabase
        .from('tenants')
        .select('*, units(unit_number, rent_amount), properties(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = tenantData?.map(t => t.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .in('user_id', userIds);

      const profileMap: Record<string, any> = {};
      profiles?.forEach(p => { profileMap[p.user_id] = p; });

      return tenantData?.map(t => ({ ...t, profile: profileMap[t.user_id] || null })) || [];
    },
  });

  // Ledger data for a specific tenant
  const { data: ledgerData } = useQuery({
    queryKey: ['tenant-ledger', showLedger],
    enabled: !!showLedger,
    queryFn: async () => {
      const [invoicesRes, paymentsRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('tenant_id', showLedger!).order('due_date', { ascending: false }),
        supabase.from('payments').select('*').eq('tenant_id', showLedger!).order('payment_date', { ascending: false }),
      ]);
      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];
      const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
      const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
      return { invoices, payments, totalInvoiced, totalPaid, balance: totalInvoiced - totalPaid };
    },
  });

  const addTenantMutation = useMutation({
    mutationFn: async () => {
      // Look up existing profile by phone number
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('phone', form.phone)
        .maybeSingle();

      let userId: string;
      if (existingProfile) {
        userId = existingProfile.user_id;
        // Update profile with latest info
        await supabase.from('profiles').update({
          full_name: form.full_name,
          id_number: form.id_number,
        }).eq('user_id', userId);
      } else {
        throw new Error('No registered user found with this phone number. Ask the tenant to sign up first, then assign them here.');
      }

      // Check if already a tenant
      const { data: existingTenant } = await supabase.from('tenants').select('id').eq('user_id', userId).eq('is_active', true).maybeSingle();
      if (existingTenant) {
        const { error } = await supabase.from('tenants').update({
          property_id: form.property_id,
          unit_id: form.unit_id || null,
          move_in_date: form.move_in_date || null,
        }).eq('id', existingTenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tenants').insert({
          user_id: userId,
          property_id: form.property_id,
          unit_id: form.unit_id || null,
          move_in_date: form.move_in_date || null,
          is_active: true,
        });
        if (error) throw error;
      }

      if (form.unit_id) {
        await supabase.from('units').update({ is_occupied: true }).eq('id', form.unit_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant assigned successfully');
      setShowForm(false);
      setForm({ full_name: '', phone: '', id_number: '', property_id: '', unit_id: '', move_in_date: '' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const ledgerTenant = tenants?.find(t => t.id === showLedger);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
        {canAddTenant && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Add Tenant
          </button>
        )}
      </div>

      {/* Add Tenant Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div className="aero-glass rounded-lg w-full max-w-md animate-aero-fade-in">
            <div className="aero-title-bar rounded-t-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-sidebar-foreground">Add Tenant to Property</span>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-sidebar-foreground/70" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addTenantMutation.mutate(); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name</label>
                <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Phone Number</label>
                <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required placeholder="0712345678" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">ID Number</label>
                <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" type="text" value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} required placeholder="12345678" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Property</label>
                <select className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value, unit_id: '' })} required>
                  <option value="">Select property</option>
                  {properties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Unit (vacant only)</label>
                <select className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.unit_id} onChange={e => setForm({ ...form, unit_id: e.target.value })}>
                  <option value="">Select unit</option>
                  {units?.map(u => <option key={u.id} value={u.id}>{u.unit_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Move-in Date</label>
                <input type="date" className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.move_in_date} onChange={e => setForm({ ...form, move_in_date: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 aero-button rounded-md px-4 py-2 text-sm text-foreground">Cancel</button>
                <button type="submit" disabled={addTenantMutation.isPending} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                  {addTenantMutation.isPending ? 'Saving...' : 'Assign Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedger && ledgerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div className="aero-glass rounded-lg w-full max-w-2xl animate-aero-fade-in max-h-[85vh] flex flex-col">
            <div className="aero-title-bar rounded-t-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-sidebar-foreground">
                Payment Ledger — {ledgerTenant?.profile?.full_name || 'Tenant'}
              </span>
              <button onClick={() => setShowLedger(null)}><X className="h-4 w-4 text-sidebar-foreground/70" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="aero-glass rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground font-medium">Total Invoiced</p>
                  <p className="text-lg font-bold text-foreground">KES {ledgerData.totalInvoiced.toLocaleString()}</p>
                </div>
                <div className="aero-glass rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground font-medium">Total Paid</p>
                  <p className="text-lg font-bold text-green-600">KES {ledgerData.totalPaid.toLocaleString()}</p>
                </div>
                <div className="aero-glass rounded-lg p-3 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground font-medium">Balance</p>
                  <p className={`text-lg font-bold ${ledgerData.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    KES {ledgerData.balance.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Invoices */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Invoices</h3>
                {ledgerData.invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No invoices</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Due Date</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.invoices.map((inv: any) => (
                        <tr key={inv.id} className="border-b border-border/50">
                          <td className="px-3 py-2 text-muted-foreground">{new Date(inv.due_date).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-foreground">{inv.description || 'Rent'}</td>
                          <td className="px-3 py-2 font-medium text-foreground">KES {Number(inv.amount).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              inv.status === 'paid' ? 'bg-green-500/10 text-green-600' :
                              inv.status === 'overdue' ? 'bg-destructive/10 text-destructive' :
                              'bg-yellow-500/10 text-yellow-600'
                            }`}>{inv.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Payments */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Payments</h3>
                {ledgerData.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments recorded</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Method</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData.payments.map((p: any) => (
                        <tr key={p.id} className="border-b border-border/50">
                          <td className="px-3 py-2 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="px-3 py-2 font-medium text-green-600">KES {Number(p.amount).toLocaleString()}</td>
                          <td className="px-3 py-2 text-muted-foreground capitalize">{p.payment_method}</td>
                          <td className="px-3 py-2 text-muted-foreground">{p.reference_number || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenants Table */}
      {isLoading ? (
        <div className="aero-glass rounded-lg p-8 text-center animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mx-auto" />
        </div>
      ) : !tenants?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No tenants registered.</p>
        </div>
      ) : (
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Name</th>
                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Phone</th>
                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">ID No.</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Rent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Move-in</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Ledger</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t: any) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                     <td className="px-4 py-3 font-medium text-foreground">{t.profile?.full_name || 'Unnamed'}</td>
                     <td className="px-4 py-3 text-muted-foreground">{t.profile?.phone || '-'}</td>
                     <td className="px-4 py-3 text-muted-foreground">{(t.profile as any)?.id_number || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.units?.unit_number || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.properties?.name || '-'}</td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {t.units?.rent_amount ? `KES ${Number(t.units.rent_amount).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.is_active ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {t.move_in_date ? new Date(t.move_in_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setShowLedger(t.id)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <CreditCard className="h-3.5 w-3.5" /> View
                      </button>
                    </td>
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

export default Tenants;
