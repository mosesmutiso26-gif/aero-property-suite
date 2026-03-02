import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Plus, Edit2, Trash2, X, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface PropertyForm {
  name: string;
  address: string;
  city: string;
  description: string;
  total_units: number;
  caretaker_id: string | null;
  landlord_id: string | null;
}

const emptyForm: PropertyForm = { name: '', address: '', city: '', description: '', total_units: 0, caretaker_id: null, landlord_id: null };

const Properties = () => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch caretakers (users with caretaker role)
  const { data: caretakers } = useQuery({
    queryKey: ['caretakers-list'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'caretaker');
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      return profiles || [];
    },
    enabled: role === 'super_admin',
  });

  // Fetch landlords (users with landlord role)
  const { data: landlords } = useQuery({
    queryKey: ['landlords-list'],
    queryFn: async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'landlord');
      if (!roles?.length) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      return profiles || [];
    },
    enabled: role === 'super_admin',
  });

  // Map user_ids to names for display
  const { data: allProfiles } = useQuery({
    queryKey: ['all-profiles-for-properties'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('user_id, full_name');
      const map: Record<string, string> = {};
      data?.forEach(p => { map[p.user_id] = p.full_name || 'Unnamed'; });
      return map;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: PropertyForm) => {
      if (editId) {
        const { error } = await supabase.from('properties').update(formData).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('properties').insert(formData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      toast.success(editId ? 'Property updated' : 'Property created');
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Property deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (property: any) => {
    setForm({
      name: property.name,
      address: property.address,
      city: property.city,
      description: property.description || '',
      total_units: property.total_units,
      caretaker_id: property.caretaker_id || null,
      landlord_id: property.landlord_id || null,
    });
    setEditId(property.id);
    setShowForm(true);
  };

  const isSuperAdmin = role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Properties</h1>
        {isSuperAdmin && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> Add Property
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
          <div className="aero-glass rounded-lg w-full max-w-md animate-aero-fade-in max-h-[90vh] overflow-y-auto">
            <div className="aero-title-bar rounded-t-lg px-4 py-3 flex items-center justify-between sticky top-0">
              <span className="text-sm font-semibold text-sidebar-foreground">
                {editId ? 'Edit Property' : 'New Property'}
              </span>
              <button onClick={() => { setShowForm(false); setEditId(null); }}>
                <X className="h-4 w-4 text-sidebar-foreground/70" />
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }}
              className="p-5 space-y-4"
            >
              {(['name', 'address', 'city'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 capitalize">{field}</label>
                  <input
                    className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none"
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    required
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <textarea
                  className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none resize-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Total Units</label>
                <input
                  type="number"
                  className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none"
                  value={form.total_units}
                  onChange={(e) => setForm({ ...form, total_units: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>

              {/* Assign Caretaker */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Assign Caretaker</label>
                  <select
                    className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none"
                    value={form.caretaker_id || ''}
                    onChange={(e) => setForm({ ...form, caretaker_id: e.target.value || null })}
                  >
                    <option value="">— No Caretaker —</option>
                    {caretakers?.map((c) => (
                      <option key={c.user_id} value={c.user_id}>
                        {c.full_name || c.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Assign Landlord */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Assign Landlord</label>
                  <select
                    className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none"
                    value={form.landlord_id || ''}
                    onChange={(e) => setForm({ ...form, landlord_id: e.target.value || null })}
                  >
                    <option value="">— No Landlord —</option>
                    {landlords?.map((l) => (
                      <option key={l.user_id} value={l.user_id}>
                        {l.full_name || l.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditId(null); }}
                  className="flex-1 aero-button rounded-md px-4 py-2 text-sm text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Properties List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aero-glass rounded-lg p-4 animate-pulse">
              <div className="h-4 w-48 bg-muted rounded mb-2" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : !properties?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No properties yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <div key={property.id} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">{property.name}</h3>
                </div>
                {isSuperAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(property)} className="p-1 rounded hover:bg-muted transition-colors">
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this property?')) deleteMutation.mutate(property.id); }}
                      className="p-1 rounded hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{property.address}, {property.city}</p>
              <p className="text-xs text-muted-foreground mt-1">{property.total_units} units</p>
              {property.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{property.description}</p>
              )}
              {/* Show assigned caretaker & landlord */}
              <div className="mt-3 pt-3 border-t border-border space-y-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <UserCheck className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-muted-foreground">Caretaker:</span>
                  <span className="font-medium text-foreground">
                    {property.caretaker_id && allProfiles?.[property.caretaker_id]
                      ? allProfiles[property.caretaker_id]
                      : 'Not assigned'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <UserCheck className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-muted-foreground">Landlord:</span>
                  <span className="font-medium text-foreground">
                    {property.landlord_id && allProfiles?.[property.landlord_id]
                      ? allProfiles[property.landlord_id]
                      : 'Not assigned'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Properties;
