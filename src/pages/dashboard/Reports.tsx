import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, TrendingUp, Building2, Users, CreditCard, Wrench, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(210,80%,45%)', 'hsl(142,60%,40%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)'];

const Reports = () => {
  const { role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['reports-data'],
    queryFn: async () => {
      const [payments, invoices, units, maintenance, expenses, properties] = await Promise.all([
        supabase.from('payments').select('amount, payment_date, payment_method'),
        supabase.from('invoices').select('amount, status, due_date'),
        supabase.from('units').select('id, is_occupied, rent_amount'),
        supabase.from('maintenance_requests').select('status, created_at'),
        supabase.from('expenses').select('amount, category, date'),
        supabase.from('properties').select('id', { count: 'exact', head: true }),
      ]);

      const totalRevenue = payments.data?.reduce((s, p) => s + Number(p.amount), 0) || 0;
      const totalExpenses = expenses.data?.reduce((s, e) => s + Number(e.amount), 0) || 0;
      const totalUnits = units.data?.length || 0;
      const occupied = units.data?.filter(u => u.is_occupied).length || 0;
      const pending = invoices.data?.filter(i => i.status === 'pending' || i.status === 'overdue') || [];
      const overdueAmount = pending.reduce((s, i) => s + Number(i.amount), 0);

      // Monthly revenue
      const monthlyMap: Record<string, number> = {};
      payments.data?.forEach(p => {
        const m = new Date(p.payment_date).toLocaleDateString('en', { month: 'short', year: '2-digit' });
        monthlyMap[m] = (monthlyMap[m] || 0) + Number(p.amount);
      });
      const monthlyRevenue = Object.entries(monthlyMap).map(([month, amount]) => ({ month, amount })).slice(-6);

      // Maintenance breakdown
      const mStatus = { pending: 0, in_progress: 0, completed: 0 };
      maintenance.data?.forEach(m => { if (m.status in mStatus) mStatus[m.status as keyof typeof mStatus]++; });

      // Payment methods
      const methods: Record<string, number> = {};
      payments.data?.forEach(p => { methods[p.payment_method || 'cash'] = (methods[p.payment_method || 'cash'] || 0) + Number(p.amount); });
      const paymentMethods = Object.entries(methods).map(([name, value]) => ({ name, value }));

      return {
        totalRevenue, totalExpenses, totalUnits, occupied, overdueAmount,
        totalProperties: properties.count || 0,
        occupancyRate: totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0,
        monthlyRevenue, mStatus, paymentMethods,
        maintenanceTotal: maintenance.data?.length || 0,
      };
    },
  });

  const exportCSV = () => {
    if (!data?.monthlyRevenue.length) return;
    const csv = 'Month,Amount\n' + data.monthlyRevenue.map(r => `${r.month},${r.amount}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'revenue-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => <div key={i} className="stat-card animate-pulse p-5"><div className="h-4 w-24 bg-muted rounded mb-3" /><div className="h-8 w-16 bg-muted rounded" /></div>)}
    </div>
  );

  const summaryCards = [
    { label: 'Total Revenue', value: `KES ${(data?.totalRevenue || 0).toLocaleString()}`, icon: CreditCard, color: 'text-aero-success' },
    { label: 'Total Expenses', value: `KES ${(data?.totalExpenses || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-destructive' },
    { label: 'Occupancy Rate', value: `${data?.occupancyRate || 0}%`, icon: Building2, color: 'text-primary' },
    { label: 'Overdue Amount', value: `KES ${(data?.overdueAmount || 0).toLocaleString()}`, icon: BarChart3, color: 'text-aero-warning' },
  ];

  const maintenancePie = [
    { name: 'Pending', value: data?.mStatus.pending || 0 },
    { name: 'In Progress', value: data?.mStatus.in_progress || 0 },
    { name: 'Completed', value: data?.mStatus.completed || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Reports & Analytics</h1>
        <button onClick={exportCSV} className="flex items-center gap-2 aero-button rounded-md px-3 py-1.5 text-[12px] text-foreground">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(c => (
          <div key={c.label} className="stat-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`h-4 w-4 ${c.color}`} />
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="aero-glass rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Revenue</h3>
          {data?.monthlyRevenue.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthlyRevenue}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Bar dataKey="amount" fill="hsl(210,80%,45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No payment data yet</p>
          )}
        </div>

        {/* Maintenance Pie */}
        <div className="aero-glass rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Maintenance Status</h3>
          {maintenancePie.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={maintenancePie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {maintenancePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No maintenance data</p>
          )}
        </div>

        {/* Payment Methods */}
        <div className="aero-glass rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Payment Methods</h3>
          {data?.paymentMethods.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.paymentMethods} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215,15%,50%)" width={60} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Bar dataKey="value" fill="hsl(142,60%,40%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No payment data</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="aero-glass rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Quick Summary</h3>
          <div className="space-y-3">
            {[
              { label: 'Properties', value: data?.totalProperties, icon: Building2 },
              { label: 'Total Units', value: data?.totalUnits, icon: Building2 },
              { label: 'Occupied Units', value: data?.occupied, icon: Users },
              { label: 'Maintenance Requests', value: data?.maintenanceTotal, icon: Wrench },
              { label: 'Net Income', value: `KES ${((data?.totalRevenue || 0) - (data?.totalExpenses || 0)).toLocaleString()}`, icon: TrendingUp },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
                <span className="text-sm font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
