import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2 } from 'lucide-react';

const MyUnit = () => {
  const { user } = useAuth();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['my-tenant', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*, units(*, properties(name, address, city)), leases(*)')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) return <div className="aero-glass rounded-lg p-8 animate-pulse"><div className="h-4 w-32 bg-muted rounded" /></div>;

  if (!tenant) {
    return (
      <div className="aero-glass rounded-lg p-8 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">You are not assigned to any unit yet.</p>
      </div>
    );
  }

  const unit = tenant.units as any;
  const lease = (tenant.leases as any)?.[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">My Unit</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="stat-card">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Unit Details</h3>
          <p className="font-semibold text-foreground">Unit {unit?.unit_number}</p>
          <p className="text-sm text-muted-foreground">Floor {unit?.floor} • {unit?.bedrooms} bed • {unit?.bathrooms} bath</p>
          <p className="text-sm font-medium text-primary mt-2">KES {Number(unit?.rent_amount).toLocaleString()}/month</p>
        </div>

        <div className="stat-card">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Property</h3>
          <p className="font-semibold text-foreground">{unit?.properties?.name}</p>
          <p className="text-sm text-muted-foreground">{unit?.properties?.address}, {unit?.properties?.city}</p>
        </div>

        {lease && (
          <div className="stat-card sm:col-span-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Lease</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Start:</span> <span className="font-medium text-foreground">{new Date(lease.start_date).toLocaleDateString()}</span></div>
              <div><span className="text-muted-foreground">End:</span> <span className="font-medium text-foreground">{new Date(lease.end_date).toLocaleDateString()}</span></div>
              <div><span className="text-muted-foreground">Rent:</span> <span className="font-medium text-foreground">KES {Number(lease.monthly_rent).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="font-medium text-foreground capitalize">{lease.status}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyUnit;
