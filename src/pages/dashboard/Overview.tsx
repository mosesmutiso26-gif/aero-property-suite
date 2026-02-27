import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  Building2, Users, CreditCard, Wrench, TrendingUp, AlertTriangle,
  FileText, BarChart3, Settings, FolderClosed, ClipboardList, BellRing
} from 'lucide-react';

const folderModules = [
  { label: 'Properties', path: '/dashboard/properties', icon: Building2, color: 'text-primary', description: 'Manage buildings' },
  { label: 'Units', path: '/dashboard/units', icon: ClipboardList, color: 'text-accent', description: 'Rooms & apartments' },
  { label: 'Tenants', path: '/dashboard/tenants', icon: Users, color: 'text-aero-success', description: 'Resident records' },
  { label: 'Invoices', path: '/dashboard/invoices', icon: FileText, color: 'text-aero-warning', description: 'Billing documents' },
  { label: 'Payments', path: '/dashboard/payments', icon: CreditCard, color: 'text-primary', description: 'Payment records' },
  { label: 'Maintenance', path: '/dashboard/maintenance', icon: Wrench, color: 'text-destructive', description: 'Repair requests' },
  { label: 'Reports', path: '/dashboard/reports', icon: BarChart3, color: 'text-accent', description: 'Analytics & data' },
  { label: 'Settings', path: '/dashboard/settings', icon: Settings, color: 'text-muted-foreground', description: 'System config' },
];

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

  const statCards = [
    { label: 'Properties', value: stats?.totalProperties || 0, icon: Building2, color: 'text-primary' },
    { label: 'Occupancy', value: `${stats?.occupancyRate || 0}%`, sub: `${stats?.occupiedUnits || 0}/${stats?.totalUnits || 0}`, icon: TrendingUp, color: 'text-aero-success' },
    { label: 'Tenants', value: stats?.activeTenants || 0, icon: Users, color: 'text-accent' },
    { label: 'Revenue', value: `KES ${(stats?.totalRevenue || 0).toLocaleString()}`, icon: CreditCard, color: 'text-aero-success' },
    { label: 'Pending Repairs', value: stats?.pendingMaintenance || 0, icon: Wrench, color: 'text-aero-warning' },
    { label: 'Overdue', value: stats?.overdueInvoices || 0, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
                {card.label}
              </span>
            </div>
            <p className="text-lg font-bold text-foreground leading-tight">
              {isLoading ? '…' : card.value}
            </p>
            {card.sub && !isLoading && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub} units</p>
            )}
          </div>
        ))}
      </div>

      {/* Folder-style module grid */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <FolderClosed className="h-4 w-4 text-primary/70" />
          <h2 className="text-sm font-semibold text-foreground">System Modules</h2>
          <span className="text-[11px] text-muted-foreground ml-auto">{folderModules.length} items</span>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {folderModules.map((mod) => (
            <Link
              key={mod.path}
              to={mod.path}
              className="aero-folder group"
            >
              <div className="p-4 flex flex-col items-center text-center gap-2">
                <div className="relative">
                  <div className="h-12 w-14 rounded bg-gradient-to-b from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                    <mod.icon className={`h-6 w-6 ${mod.color} group-hover:scale-110 transition-transform`} />
                  </div>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {mod.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{mod.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Overview;
