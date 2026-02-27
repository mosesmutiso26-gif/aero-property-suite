import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Camera } from 'lucide-react';

const Profile = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Profile updated successfully'),
    onError: (err: any) => toast.error(err.message),
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: notifications } = useQuery({
    queryKey: ['profile-notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user!.id).eq('is_read', false).order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Profile</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile Form */}
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="aero-toolbar px-4 py-2 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Personal Information</span>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="p-5 space-y-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                <User className="h-8 w-8 text-primary/60" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
              <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-muted-foreground focus:outline-none" value={user?.email || ''} disabled />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name</label>
              <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
              <input className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
            </div>
            <button type="submit" disabled={updateMutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 w-full sm:w-auto">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="aero-toolbar px-4 py-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Change Password</span>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (newPassword.length < 6) { toast.error('Min 6 characters'); return; } passwordMutation.mutate(); }} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">New Password</label>
              <input type="password" className="aero-input w-full rounded-md px-3 py-2 text-sm text-foreground focus:outline-none" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} required />
            </div>
            <button type="submit" disabled={passwordMutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 w-full sm:w-auto">
              {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Unread Notifications */}
        <div className="aero-glass rounded-lg overflow-hidden lg:col-span-2">
          <div className="aero-toolbar px-4 py-2">
            <span className="text-sm font-semibold text-foreground">Unread Notifications ({notifications?.length || 0})</span>
          </div>
          <div className="p-3">
            {notifications?.length ? notifications.map((n: any) => (
              <div key={n.id} className="py-2 border-b border-border/30 last:border-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-[11px] text-muted-foreground">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-4">All caught up!</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
