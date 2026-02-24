import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface UnitForm {
  property_id: string;
  unit_number: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  description: string;
}

const emptyForm: UnitForm = { property_id: '', unit_number: '', floor: 0, bedrooms: 1, bathrooms: 1, rent_amount: 0, description: '' };

const Units = () => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<UnitForm>(emptyForm);

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data } = await supabase.from('properties').select('id, name');
      return data || [];
    },
  });

  const { data: units, isLoading } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*, properties(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: UnitForm) => {
      if (editId) {
        const { error } = await supabase.from('units').update(formData).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('units').insert(formData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      toast.success(editId ? 'Unit updated' : 'Unit created');
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      toast.success('Unit deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isSuperAdmin = role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Units</h1>
        {isSuperAdmin && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add Unit
          </button>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div className="aero-glass rounded-lg w-full max-w-md animate-aero-fade-in">
            <div className="aero-title-bar rounded-t-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-sidebar-foreground">
                {editId ? 'Edit Unit' : 'New Unit'}
              </span>
              <button onClick={() => { setShowForm(false); setEditId(null); }}>
                <X className="h-4 w-4 text-sidebar-foreground/70" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Property</label>
                <select
                  className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none"
                  value={form.property_id}
                  onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                  required
                >
                  <option value="">Select property</option>
                  {properties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Unit Number</label>
                <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Floor</label>
                  <input type="number" className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.floor} onChange={(e) => setForm({ ...form, floor: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Beds</label>
                  <input type="number" className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: parseInt(e.target.value) || 1 })} min={0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Baths</label>
                  <input type="number" className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: parseInt(e.target.value) || 1 })} min={0} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Monthly Rent (KES)</label>
                <input type="number" className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: parseFloat(e.target.value) || 0 })} min={0} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 aero-button rounded-md px-4 py-2 text-sm text-foreground">Cancel</button>
                <button type="submit" disabled={saveMutation.isPending} className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="aero-glass rounded-lg p-8 text-center animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mx-auto" />
        </div>
      ) : !units?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No units yet.</p>
        </div>
      ) : (
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Floor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Beds/Baths</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Rent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  {isSuperAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {units.map((unit: any) => (
                  <tr key={unit.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{unit.unit_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{unit.properties?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{unit.floor}</td>
                    <td className="px-4 py-3 text-muted-foreground">{unit.bedrooms}/{unit.bathrooms}</td>
                    <td className="px-4 py-3 text-foreground font-medium">KES {Number(unit.rent_amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${unit.is_occupied ? 'bg-aero-success/10 text-aero-success' : 'bg-muted text-muted-foreground'}`}>
                        {unit.is_occupied ? 'Occupied' : 'Vacant'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setForm({ property_id: unit.property_id, unit_number: unit.unit_number, floor: unit.floor, bedrooms: unit.bedrooms, bathrooms: unit.bathrooms, rent_amount: Number(unit.rent_amount), description: unit.description || '' }); setEditId(unit.id); setShowForm(true); }} className="p-1 rounded hover:bg-muted"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                          <button onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(unit.id); }} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                        </div>
                      </td>
                    )}
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

export default Units;
