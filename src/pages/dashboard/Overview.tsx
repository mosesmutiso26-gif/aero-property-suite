import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, CreditCard, Wrench, TrendingUp, AlertTriangle } from 'lucide-react';

const Overview = () => {
  const { role } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', role],
    queryFn: async () => {
      const [properties, units, tenants, maintenance, payments, invoices] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('units').select('id, is_occupied', { count: 'exact' }),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('maintenance_requests').select('id, status', { count: 'exact' }),
        supabase.from('payments').select('amount'),
        supabase.from('invoices').select('id, status', { count: 'exact' }),
      ]);

      const totalRevenue = payments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const occupiedUnits = units.data?.filter(u => u.is_occupied).length || 0;
      const totalUnits = units.count || 0;
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
      const pendingMaintenance = maintenance.data?.filter(m => m.status === 'pending').length || 0;
      const overdueInvoices = invoices.data?.filter(i => i.status === 'overdue').length || 0;

      return {
        totalProperties: properties.count || 0,
        totalUnits,
        occupiedUnits,
        occupancyRate,
        activeTenants: tenants.count || 0,
        totalRevenue,
        pendingMaintenance,
        overdueInvoices,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="h-4 w-24 bg-muted rounded mb-3" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Properties',
      value: stats?.totalProperties || 0,
      icon: <Building2 className="h-5 w-5" />,
      color: 'text-primary',
    },
    {
      label: 'Occupancy Rate',
      value: `${stats?.occupancyRate || 0}%`,
      subtitle: `${stats?.occupiedUnits}/${stats?.totalUnits} units`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-aero-success',
    },
    {
      label: 'Active Tenants',
      value: stats?.activeTenants || 0,
      icon: <Users className="h-5 w-5" />,
      color: 'text-accent',
    },
    {
      label: 'Total Revenue',
      value: `KES ${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: <CreditCard className="h-5 w-5" />,
      color: 'text-aero-success',
    },
    {
      label: 'Pending Maintenance',
      value: stats?.pendingMaintenance || 0,
      icon: <Wrench className="h-5 w-5" />,
      color: 'text-aero-warning',
    },
    {
      label: 'Overdue Invoices',
      value: stats?.overdueInvoices || 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-destructive',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome to Aero Property Suite
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <span className={card.color}>{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Overview;
