import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FileText } from 'lucide-react';

const statusColor: Record<string, string> = {
  pending: 'bg-aero-warning/10 text-aero-warning',
  paid: 'bg-aero-success/10 text-aero-success',
  overdue: 'bg-destructive/10 text-destructive',
  partial: 'bg-primary/10 text-primary',
};

const Invoices = () => {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, units(unit_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Invoices</h1>

      {isLoading ? (
        <div className="aero-glass rounded-lg p-8 text-center animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mx-auto" />
        </div>
      ) : !invoices?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No invoices yet.</p>
        </div>
      ) : (
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Description</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{inv.units?.unit_number}</td>
                    <td className="px-4 py-3 text-foreground font-medium">KES {Number(inv.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(inv.due_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor[inv.status] || ''}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{inv.description}</td>
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

export default Invoices;
