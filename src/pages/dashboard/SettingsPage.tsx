import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Bell, Shield, Database, Globe } from 'lucide-react';

const SettingsPage = () => {
  const { role, profile, user } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = role === 'super_admin';

  // Notification preferences (stored locally for now, can be moved to DB)
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);

  // System stats for super admin
  const { data: systemStats } = useQuery({
    queryKey: ['system-stats'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const [profiles, properties, units, tenants] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('units').select('id', { count: 'exact', head: true }),
        supabase.from('tenants').select('id', { count: 'exact', head: true }),
      ]);
      return {
        totalUsers: profiles.count || 0,
        totalProperties: properties.count || 0,
        totalUnits: units.count || 0,
        totalTenants: tenants.count || 0,
      };
    },
  });

  // Audit logs for super admin
  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const handleSavePreferences = () => {
    toast.success('Notification preferences saved');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Notification Preferences */}
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="aero-toolbar px-4 py-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Notification Preferences</span>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: 'Email Notifications', desc: 'Receive email alerts for important updates', value: emailNotifs, set: setEmailNotifs },
              { label: 'Maintenance Alerts', desc: 'Get notified about maintenance request updates', value: maintenanceAlerts, set: setMaintenanceAlerts },
              { label: 'Payment Alerts', desc: 'Get notified about payment and invoice updates', value: paymentAlerts, set: setPaymentAlerts },
            ].map(item => (
              <label key={item.label} className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => item.set(!item.value)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${item.value ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
            ))}
            <button onClick={handleSavePreferences} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity mt-2">
              Save Preferences
            </button>
          </div>
        </div>

        {/* Account Info */}
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="aero-toolbar px-4 py-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Account Information</span>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: 'Name', value: profile?.full_name || 'Not set' },
              { label: 'Email', value: user?.email || '' },
              { label: 'Phone', value: profile?.phone || 'Not set' },
              { label: 'Role', value: role?.replace('_', ' ') || 'No role' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-medium text-foreground capitalize">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Overview - Super Admin Only */}
        {isSuperAdmin && (
          <div className="aero-glass rounded-lg overflow-hidden">
            <div className="aero-toolbar px-4 py-2 flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">System Overview</span>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Total Users', value: systemStats?.totalUsers },
                { label: 'Properties', value: systemStats?.totalProperties },
                { label: 'Units', value: systemStats?.totalUnits },
                { label: 'Active Tenants', value: systemStats?.totalTenants },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-bold text-foreground">{item.value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Logs - Super Admin Only */}
        {isSuperAdmin && (
          <div className="aero-glass rounded-lg overflow-hidden">
            <div className="aero-toolbar px-4 py-2 flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Recent Audit Logs</span>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {auditLogs?.length ? (
                <div className="space-y-2">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="text-[12px] py-1.5 border-b border-border/30 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground capitalize">{log.action}</span>
                        <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <span className="text-muted-foreground">Table: {log.table_name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No audit logs yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
