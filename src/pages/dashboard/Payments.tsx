import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard } from 'lucide-react';

const Payments = () => {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Payments</h1>

      {isLoading ? (
        <div className="aero-glass rounded-lg p-8 text-center animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mx-auto" />
        </div>
      ) : !payments?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No payments recorded.</p>
        </div>
      ) : (
        <div className="aero-glass rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-foreground">KES {Number(p.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{p.payment_method}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.reference_number || '-'}</td>
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

export default Payments;
