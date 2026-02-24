import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Wrench } from 'lucide-react';

const statusColor: Record<string, string> = {
  pending: 'bg-aero-warning/10 text-aero-warning',
  in_progress: 'bg-primary/10 text-primary',
  completed: 'bg-aero-success/10 text-aero-success',
};

const Maintenance = () => {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, units(unit_number), properties(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Maintenance Requests</h1>

      {isLoading ? (
        <div className="aero-glass rounded-lg p-8 text-center animate-pulse">
          <div className="h-4 w-32 bg-muted rounded mx-auto" />
        </div>
      ) : !requests?.length ? (
        <div className="aero-glass rounded-lg p-8 text-center">
          <Wrench className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No maintenance requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => (
            <div key={req.id} className="stat-card">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground text-sm">{req.title}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColor[req.status] || ''}`}>
                  {req.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{req.description}</p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Unit: {req.units?.unit_number}</span>
                <span>Property: {req.properties?.name}</span>
                <span>{new Date(req.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Maintenance;
