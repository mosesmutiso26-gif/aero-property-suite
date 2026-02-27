import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Shield, Plus, X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const UserManagement = () => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = role === 'super_admin';
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: roles } = await supabase.from('user_roles').select('*');
      const roleMap: Record<string, string> = {};
      roles?.forEach(r => { roleMap[r.user_id] = r.role; });

      return profiles.map(p => ({ ...p, role: roleMap[p.user_id] || 'No Role' }));
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'super_admin' | 'landlord' | 'caretaker' | 'tenant' }) => {
      const { data: existing } = await supabase.from('user_roles').select('id').eq('user_id', userId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role updated');
      setEditUserId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const roleBadgeColor: Record<string, string> = {
    super_admin: 'bg-destructive/10 text-destructive',
    landlord: 'bg-primary/10 text-primary',
    caretaker: 'bg-aero-warning/10 text-aero-warning',
    tenant: 'bg-aero-success/10 text-aero-success',
    'No Role': 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">User Management</h1>

      {isLoading ? (
        <div className="aero-glass rounded-lg p-8 text-center animate-pulse"><div className="h-4 w-32 bg-muted rounded mx-auto" /></div>
      ) : !users?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Joined</th>
                  {isSuperAdmin && <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        {u.full_name || 'Unnamed'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.phone || '-'}</td>
                    <td className="px-4 py-3">
                      {editUserId === u.user_id ? (
                        <div className="flex items-center gap-2">
                          <select
                            className="aero-input rounded px-2 py-1 text-xs text-foreground focus:outline-none"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                          >
                            <option value="tenant">Tenant</option>
                            <option value="caretaker">Caretaker</option>
                            <option value="landlord">Landlord</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                          <button
                            onClick={() => updateRoleMutation.mutate({ userId: u.user_id, newRole: selectedRole as 'super_admin' | 'landlord' | 'caretaker' | 'tenant' })}
                            disabled={updateRoleMutation.isPending}
                            className="text-xs text-primary font-medium hover:underline"
                          >
                            Save
                          </button>
                          <button onClick={() => setEditUserId(null)} className="text-xs text-muted-foreground hover:underline">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${roleBadgeColor[u.role] || roleBadgeColor['No Role']}`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        {editUserId !== u.user_id && (
                          <button
                            onClick={() => { setEditUserId(u.user_id); setSelectedRole(u.role === 'No Role' ? 'tenant' : u.role); }}
                            className="p-1 rounded hover:bg-muted"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
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

export default UserManagement;
